import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import app from './firebase';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  location?: string;
}

export interface TrainerCalendarCredentials {
  refreshToken: string;
  email: string;
  connectedAt: string;
}

// Custom error for calendar disconnection
export class CalendarDisconnectedError extends Error {
  constructor(message: string, public reason: 'invalid_grant' | 'revoked' | 'network_error') {
    super(message);
    this.name = 'CalendarDisconnectedError';
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = (import.meta as any).env?.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = typeof window !== 'undefined' 
  ? `${window.location.origin}/oauth/callback` 
  : 'http://localhost:5173/oauth/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Firestore collection for secure credential storage
const CREDENTIALS_COLLECTION = 'userCredentials';

// ============================================================================
// OAUTH FLOW - AUTHORIZATION
// ============================================================================

/**
 * Generate Google OAuth authorization URL
 * CRITICAL: Must use access_type=offline and prompt=consent to get refresh token
 */
export const getGoogleAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID || '',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline', // MUST HAVE: This ensures we get refresh token
    prompt: 'consent',      // MUST HAVE: Force consent screen to guarantee refresh token
    include_granted_scopes: 'true',
  });
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log('🔐 Generated OAuth URL with offline access');
  
  return authUrl;
};

/**
 * Exchange authorization code for tokens using REST API
 * Called after user authorizes and is redirected back
 */
export const exchangeCodeForTokens = async (code: string): Promise<TrainerCalendarCredentials> => {
  try {
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. User may have already authorized this app.');
    }
    
    // Get user email from token info endpoint
    const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${tokens.access_token}`);
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }
    
    const tokenInfo = await userInfoResponse.json();
    
    const credentials: TrainerCalendarCredentials = {
      refreshToken: tokens.refresh_token,
      email: tokenInfo.email || '',
      connectedAt: new Date().toISOString(),
    };
    
    console.log('✅ Tokens received successfully');
    console.log('📧 User email:', credentials.email);
    console.log('🔑 Refresh token obtained:', !!credentials.refreshToken);
    
    return credentials;
  } catch (error: any) {
    console.error('❌ Error exchanging code for tokens:', error);
    throw new Error(`Failed to exchange authorization code: ${error.message}`);
  }
};

// ============================================================================
// CREDENTIAL MANAGEMENT
// ============================================================================

/**
 * Save trainer's credentials securely to Firestore
 * Only stores refresh token, never access token
 */
export const saveTrainerCredentials = async (
  trainerId: string,
  credentials: TrainerCalendarCredentials
): Promise<void> => {
  const db = getFirestore(app);
  const credentialsRef = doc(db, CREDENTIALS_COLLECTION, trainerId);
  
  try {
    await setDoc(credentialsRef, {
      refreshToken: credentials.refreshToken,
      email: credentials.email,
      connectedAt: credentials.connectedAt,
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ Credentials saved securely to Firestore');
  } catch (error) {
    console.error('❌ Error saving credentials:', error);
    throw error;
  }
};

/**
 * Get trainer's credentials from Firestore
 */
export const getTrainerCredentials = async (trainerId: string): Promise<TrainerCalendarCredentials | null> => {
  const db = getFirestore(app);
  const credentialsRef = doc(db, CREDENTIALS_COLLECTION, trainerId);
  
  try {
    const credentialsDoc = await getDoc(credentialsRef);
    
    if (!credentialsDoc.exists()) {
      console.log('⚠️ No credentials found for trainer:', trainerId);
      return null;
    }
    
    const data = credentialsDoc.data();
    return {
      refreshToken: data.refreshToken,
      email: data.email,
      connectedAt: data.connectedAt,
    };
  } catch (error) {
    console.error('❌ Error getting credentials:', error);
    return null;
  }
};

/**
 * Delete trainer's credentials from Firestore
 */
export const deleteTrainerCredentials = async (trainerId: string): Promise<void> => {
  const db = getFirestore(app);
  const credentialsRef = doc(db, CREDENTIALS_COLLECTION, trainerId);
  
  try {
    await updateDoc(credentialsRef, {
      refreshToken: '',
      deletedAt: new Date().toISOString(),
    });
    console.log('✅ Credentials deleted');
  } catch (error) {
    console.error('❌ Error deleting credentials:', error);
  }
};

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Get fresh access token using refresh token
 * Access tokens expire after 1 hour, this function gets a new one
 */
const getAccessTokenFromRefreshToken = async (refreshToken: string): Promise<string> => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (error.error === 'invalid_grant') {
        throw new CalendarDisconnectedError(
          'Refresh token has been revoked',
          'invalid_grant'
        );
      }
      throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
    }
    
    const data = await response.json();
    console.log('✅ Access token refreshed successfully');
    
    return data.access_token;
  } catch (error) {
    console.error('❌ Error refreshing access token:', error);
    throw error;
  }
};

// ============================================================================
// CALENDAR SERVICE - WITH AUTO TOKEN REFRESH
// ============================================================================

/**
 * Create calendar event on trainer's calendar with student as attendee
 * Automatically handles token refresh
 * Throws CalendarDisconnectedError if refresh token is invalid
 */
export const createCalendarEvent = async (
  trainerId: string,
  eventData: CalendarEvent,
  retryCount = 0
): Promise<string> => {
  const MAX_RETRIES = 2;
  
  try {
    // Get trainer's refresh token
    const credentials = await getTrainerCredentials(trainerId);
    
    if (!credentials) {
      throw new CalendarDisconnectedError(
        'Trainer has not connected Google Calendar',
        'revoked'
      );
    }
    
    // Get fresh access token
    const accessToken = await getAccessTokenFromRefreshToken(credentials.refreshToken);
    
    console.log('📅 Creating calendar event...');
    
    // Create event using Google Calendar REST API
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401 || error.error?.message?.includes('invalid_grant')) {
        throw new CalendarDisconnectedError(
          'Calendar connection is no longer valid. Please reconnect.',
          'invalid_grant'
        );
      }
      
      if (response.status === 403) {
        throw new CalendarDisconnectedError(
          'Calendar access has been revoked. Please reconnect.',
          'revoked'
        );
      }
      
      throw new Error(`Calendar API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const event = await response.json();
    const eventId = event.id;
    
    console.log('✅ Calendar event created:', eventId);
    
    return eventId || '';
  } catch (error: any) {
    console.error('❌ Error creating calendar event:', error);
    
    // Already a CalendarDisconnectedError, just rethrow
    if (error instanceof CalendarDisconnectedError) {
      throw error;
    }
    
    // Retry on transient errors
    if (retryCount < MAX_RETRIES && (error.message?.includes('500') || error.message?.includes('503') || error.code === 'ECONNRESET')) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`⏳ Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return createCalendarEvent(trainerId, eventData, retryCount + 1);
    }
    
    // Network or other transient errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new CalendarDisconnectedError(
        'Network error while connecting to Google Calendar',
        'network_error'
      );
    }
    
    throw error;
  }
};

/**
 * Update calendar event
 */
export const updateCalendarEvent = async (
  trainerId: string,
  eventId: string,
  eventData: Partial<CalendarEvent>,
  retryCount = 0
): Promise<void> => {
  const MAX_RETRIES = 2;
  
  try {
    const credentials = await getTrainerCredentials(trainerId);
    
    if (!credentials) {
      throw new CalendarDisconnectedError(
        'Trainer has not connected Google Calendar',
        'revoked'
      );
    }
    
    const accessToken = await getAccessTokenFromRefreshToken(credentials.refreshToken);
    
    console.log('📝 Updating calendar event:', eventId);
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401 || error.error?.message?.includes('invalid_grant')) {
        throw new CalendarDisconnectedError(
          'Calendar connection is no longer valid. Please reconnect.',
          'invalid_grant'
        );
      }
      
      if (response.status === 403) {
        throw new CalendarDisconnectedError(
          'Calendar access has been revoked. Please reconnect.',
          'revoked'
        );
      }
      
      throw new Error(`Calendar API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    console.log('✅ Calendar event updated');
  } catch (error: any) {
    console.error('❌ Error updating calendar event:', error);
    
    if (error instanceof CalendarDisconnectedError) {
      throw error;
    }
    
    if (retryCount < MAX_RETRIES && (error.message?.includes('500') || error.message?.includes('503'))) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`⏳ Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return updateCalendarEvent(trainerId, eventId, eventData, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Delete calendar event
 */
export const deleteCalendarEvent = async (
  trainerId: string,
  eventId: string,
  retryCount = 0
): Promise<void> => {
  const MAX_RETRIES = 2;
  
  try {
    const credentials = await getTrainerCredentials(trainerId);
    
    if (!credentials) {
      console.log('⚠️ No credentials found, skipping calendar event deletion');
      return;
    }
    
    const accessToken = await getAccessTokenFromRefreshToken(credentials.refreshToken);
    
    console.log('🗑️ Deleting calendar event:', eventId);
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    // 404 means already deleted, that's fine
    if (response.status === 404) {
      console.log('ℹ️ Calendar event already deleted or not found');
      return;
    }
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401 || error.error?.message?.includes('invalid_grant')) {
        throw new CalendarDisconnectedError(
          'Calendar connection is no longer valid. Please reconnect.',
          'invalid_grant'
        );
      }
      
      if (response.status === 403) {
        throw new CalendarDisconnectedError(
          'Calendar access has been revoked. Please reconnect.',
          'revoked'
        );
      }
      
      throw new Error(`Calendar API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    console.log('✅ Calendar event deleted');
  } catch (error: any) {
    console.error('❌ Error deleting calendar event:', error);
    
    if (error instanceof CalendarDisconnectedError) {
      throw error;
    }
    
    if (retryCount < MAX_RETRIES && (error.message?.includes('500') || error.message?.includes('503'))) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`⏳ Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return deleteCalendarEvent(trainerId, eventId, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Test calendar connection by attempting to list calendars
 */
export const testCalendarConnection = async (trainerId: string): Promise<boolean> => {
  try {
    const credentials = await getTrainerCredentials(trainerId);
    
    if (!credentials) {
      return false;
    }
    
    const accessToken = await getAccessTokenFromRefreshToken(credentials.refreshToken);
    
    // Try to list calendars as a test
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (response.ok) {
      console.log('✅ Calendar connection is valid');
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('❌ Calendar connection test failed:', error);
    
    if (error instanceof CalendarDisconnectedError) {
      return false;
    }
    
    // Network errors don't mean disconnected, just temporary issue
    return true;
  }
};

// ============================================================================
// HIGH-LEVEL BOOKING INTEGRATION
// ============================================================================

/**
 * Create booking calendar event with proper error handling
 * This is the main function called from store.ts
 */
export const createBookingCalendarEvent = async (
  trainerId: string,
  trainerEmail: string,
  studentEmail: string,
  eventTypeName: string,
  trainerName: string,
  studentName: string,
  startTime: Date,
  endTime: Date,
  zoomMeetingLink?: string,
  note?: string,
  studentTimezone?: string,
  bookingId?: string
): Promise<string> => {
  const timeZone = studentTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Extract clean Zoom URL for location field
  let zoomUrl = '';
  if (zoomMeetingLink) {
    const urlMatch = zoomMeetingLink.match(/https?:\/\/[^\s]+/);
    zoomUrl = urlMatch ? urlMatch[0] : zoomMeetingLink;
  }

  // Format times in both timezones for display
  const vietnamTZ = 'Asia/Ho_Chi_Minh';
  const dateFormatOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  };
  
  const vietnamTimeStr = startTime.toLocaleString('vi-VN', { ...dateFormatOptions, timeZone: vietnamTZ });
  const studentTimeStr = studentTimezone ? startTime.toLocaleString('vi-VN', { ...dateFormatOptions, timeZone: studentTimezone }) : vietnamTimeStr;

  // Build professional Vietnamese description
  let description = `📚 ${eventTypeName}\n`;
  description += `👤 Học viên: ${studentName}\n`;
  description += `📧 Email: ${studentEmail}\n`;
  description += `👨‍🏫 Giảng viên: ${trainerName}\n\n`;
  
  description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  description += `⏰ THỜI GIAN HỌC\n`;
  description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  description += `🇻🇳 Giờ Việt Nam: ${vietnamTimeStr}\n`;
  if (studentTimezone && studentTimezone !== vietnamTZ) {
    description += `🌍 Giờ địa phương của bạn: ${studentTimeStr}\n`;
  }
  
  if (zoomMeetingLink) {
    description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    description += `🎥 THÔNG TIN THAM GIA ZOOM\n`;
    description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    description += zoomMeetingLink;
    description += `\n\n💡 Lưu ý: Vui lòng tham gia đúng giờ để không bỏ lỡ buổi học.`;
  }
  
  if (note) {
    description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    description += `📝 GHI CHÚ\n`;
    description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    description += note;
  }
  
  if (bookingId) {
    const baseUrl = window.location.origin || 'https://pte-intensive-booking.vercel.app';
    const cancelUrl = `${baseUrl}/cancel-booking/${bookingId}`;
    const rescheduleUrl = `${baseUrl}/reschedule-booking/${bookingId}`;
    
    description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    description += `📌 QUẢN LÝ LỊCH HỌC\n`;
    description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;     
    description += `📅 Đổi lịch học: ${rescheduleUrl}\n`;
    description += `❌ Hủy lịch học: ${cancelUrl}\n`;
  }
  
  description += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  description += `Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ giảng viên qua email: ${trainerEmail}`;

  const event: CalendarEvent = {
    summary: `${eventTypeName} - ${studentName}`,
    description: description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: timeZone
    },
    attendees: [
      { email: studentEmail, displayName: studentName }
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 } // 1 hour before
      ]
    }
  };

  if (zoomUrl) {
    event.location = zoomUrl;
  }

  return createCalendarEvent(trainerId, event);
};

/**
 * Delete booking calendar event with proper error handling
 */
export const deleteBookingCalendarEvent = async (
  trainerId: string,
  eventId: string
): Promise<void> => {
  return deleteCalendarEvent(trainerId, eventId);
};
