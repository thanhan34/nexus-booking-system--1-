import { format } from 'date-fns';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import app from './firebase';

export interface CalendarConfig {
  apiKey?: string;
  clientId?: string;
  scopes: string[];
}

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
}

export interface TrainerTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email: string;
}

// Google Calendar API Configuration
const CALENDAR_CONFIG: CalendarConfig = {
  apiKey: (import.meta as any).env?.VITE_GOOGLE_API_KEY,
  clientId: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID,
  scopes: [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
  ]
};

let gapiInited = false;
let gisInited = false;
let tokenClient: any = null;

// Firestore collection for secure token storage
const TOKENS_COLLECTION = 'userCredentials';

/**
 * Initialize Google API (gapi) and Google Identity Services (gis)
 */
export const initGoogleCalendar = async (): Promise<void> => {
  if (gapiInited && gisInited) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let gapiLoaded = false;
    let gisLoaded = false;

    const checkBothLoaded = () => {
      if (gapiLoaded && gisLoaded) {
        resolve();
      }
    };

    // Load gapi script
    if (!gapiInited) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              apiKey: CALENDAR_CONFIG.apiKey,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
            });
            gapiInited = true;
            gapiLoaded = true;
            console.log('✅ Google Calendar API initialized');
            checkBothLoaded();
          } catch (error) {
            console.error('❌ Error initializing gapi:', error);
            reject(error);
          }
        });
      };
      gapiScript.onerror = () => reject(new Error('Failed to load Google API script'));
      document.body.appendChild(gapiScript);
    } else {
      gapiLoaded = true;
      checkBothLoaded();
    }

    // Load Google Identity Services (gis) script
    if (!gisInited) {
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = () => {
        gisInited = true;
        gisLoaded = true;
        console.log('✅ Google Identity Services loaded');
        checkBothLoaded();
      };
      gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.body.appendChild(gisScript);
    } else {
      gisLoaded = true;
      checkBothLoaded();
    }
  });
};

/**
 * Save trainer's tokens securely to Firestore
 */
export const saveTrainerTokens = async (
  trainerId: string,
  tokens: TrainerTokens
): Promise<void> => {
  const db = getFirestore(app);
  const tokenDocRef = doc(db, TOKENS_COLLECTION, trainerId);
  
  try {
    await setDoc(tokenDocRef, {
      ...tokens,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Trainer tokens saved securely');
  } catch (error) {
    console.error('❌ Error saving trainer tokens:', error);
    throw error;
  }
};

/**
 * Get trainer's tokens from Firestore
 */
export const getTrainerTokens = async (trainerId: string): Promise<TrainerTokens | null> => {
  const db = getFirestore(app);
  const tokenDocRef = doc(db, TOKENS_COLLECTION, trainerId);
  
  try {
    const tokenDoc = await getDoc(tokenDocRef);
    if (tokenDoc.exists()) {
      return tokenDoc.data() as TrainerTokens;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting trainer tokens:', error);
    return null;
  }
};

/**
 * Refresh trainer's access token using refresh token
 */
export const refreshTrainerAccessToken = async (refreshToken: string): Promise<{ accessToken: string; expiryDate: number }> => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CALENDAR_CONFIG.clientId || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    const expiryDate = Date.now() + (data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      expiryDate
    };
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    throw error;
  }
};

/**
 * Authorize trainer's Google Calendar - opens OAuth popup
 */
export const authorizeTrainerCalendar = async (): Promise<TrainerTokens> => {
  await initGoogleCalendar();

  return new Promise((resolve, reject) => {
    if (!(window as any).google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    // Use Token Client for client-side OAuth (implicit flow with refresh token)
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CALENDAR_CONFIG.clientId,
      scope: CALENDAR_CONFIG.scopes.join(' '),
      prompt: 'consent', // Force consent to get refresh token
      callback: async (response: any) => {
        if (response.error) {
          console.error('OAuth error:', response);
          reject(new Error(response.error));
          return;
        }

        try {
          console.log('✅ Access token received', {
            hasAccessToken: !!response.access_token,
            expiresIn: response.expires_in
          });
          
          // Get user email from token info endpoint
          const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${response.access_token}`);
          
          if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            console.error('User info error:', errorText);
            throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
          }
          
          const tokenInfo = await userInfoResponse.json();
          console.log('✅ Token info received:', { email: tokenInfo.email });
          
          const tokens: TrainerTokens = {
            accessToken: response.access_token,
            refreshToken: response.refresh_token || '', // May not be provided in implicit flow
            expiryDate: Date.now() + (response.expires_in * 1000),
            email: tokenInfo.email
          };

          console.log('✅ Tokens prepared successfully');

          resolve(tokens);
        } catch (error: any) {
          console.error('Error processing OAuth response:', error);
          reject(new Error(error.message || 'Failed to process OAuth response'));
        }
      },
    });

    // Request access token
    client.requestAccessToken();
  });
};

/**
 * Get valid access token for trainer (refreshes if needed)
 */
export const getValidTrainerToken = async (trainerId: string): Promise<string> => {
  const tokens = await getTrainerTokens(trainerId);
  
  if (!tokens) {
    throw new Error('Trainer has not connected Google Calendar');
  }

  // Check if token is expired or will expire in next 5 minutes
  if (tokens.expiryDate < Date.now() + 300000) {
    console.log('🔄 Token expired, refreshing...');
    const { accessToken, expiryDate } = await refreshTrainerAccessToken(tokens.refreshToken);
    
    // Update stored tokens
    await saveTrainerTokens(trainerId, {
      ...tokens,
      accessToken,
      expiryDate
    });
    
    return accessToken;
  }

  return tokens.accessToken;
};

/**
 * Create a calendar event using trainer's access token
 */
export const createCalendarEventWithToken = async (
  accessToken: string,
  event: CalendarEvent
): Promise<string> => {
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('✅ Calendar event created:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Error creating calendar event:', error);
    throw error;
  }
};

/**
 * Update a calendar event using trainer's access token
 */
export const updateCalendarEventWithToken = async (
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<void> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    console.log('✅ Calendar event updated:', eventId);
  } catch (error) {
    console.error('❌ Error updating calendar event:', error);
    throw error;
  }
};

/**
 * Delete a calendar event using trainer's access token
 */
export const deleteCalendarEventWithToken = async (
  accessToken: string,
  eventId: string
): Promise<void> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    console.log('✅ Calendar event deleted:', eventId);
  } catch (error) {
    console.error('❌ Error deleting calendar event:', error);
    throw error;
  }
};

/**
 * Create calendar event on trainer's calendar with student as attendee
 * This automatically sends an email invitation to the student
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
  try {
    // Get trainer's valid access token
    const accessToken = await getValidTrainerToken(trainerId);
    
    // Use student's timezone if provided, otherwise fall back to system timezone
    const timeZone = studentTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Extract main URL from Zoom invitation block for location field
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
    
    // Add time information in both timezones
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
    
    // Add cancel/reschedule links if bookingId is provided
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

    // Create event on trainer's calendar with student as attendee
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

    // Add location field with clean URL (shows as clickable link)
    if (zoomUrl) {
      (event as any).location = zoomUrl;
    }

    const eventId = await createCalendarEventWithToken(accessToken, event);
    
    console.log('✅ Calendar event created and invitation sent to student');
    return eventId;
  } catch (error) {
    console.error('❌ Error creating booking calendar event:', error);
    throw error;
  }
};

/**
 * Delete booking calendar event from trainer's calendar
 * This automatically notifies the student via email
 */
export const deleteBookingCalendarEvent = async (
  trainerId: string,
  eventId: string
): Promise<void> => {
  try {
    const accessToken = await getValidTrainerToken(trainerId);
    await deleteCalendarEventWithToken(accessToken, eventId);
    console.log('✅ Calendar event deleted and cancellation sent to student');
  } catch (error) {
    console.error('❌ Error deleting booking calendar event:', error);
    throw error;
  }
};
