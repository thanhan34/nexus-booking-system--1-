import { format } from 'date-fns';

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

// Google Calendar API Configuration
const CALENDAR_CONFIG: CalendarConfig = {
  apiKey: (import.meta as any).env?.VITE_GOOGLE_API_KEY,
  clientId: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/calendar.events']
};

let gapiInited = false;
let tokenClient: any = null;

/**
 * Initialize Google API (gapi) and Google Identity Services (gis)
 */
export const initGoogleCalendar = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Load gapi script
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
          console.log('✅ Google Calendar API initialized');
        } catch (error) {
          console.error('❌ Error initializing gapi:', error);
          reject(error);
        }
      });
    };
    document.body.appendChild(gapiScript);

    // Load Google Identity Services (gis) script
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CALENDAR_CONFIG.clientId,
        scope: CALENDAR_CONFIG.scopes.join(' '),
        callback: '' // Will be set per request
      });
      console.log('✅ Google Identity Services initialized');
      resolve();
    };
    document.body.appendChild(gisScript);
  });
};

/**
 * Get access token for the user
 */
export const getAccessToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Identity Services not initialized'));
      return;
    }

    tokenClient.callback = (response: any) => {
      if (response.error !== undefined) {
        reject(response);
      } else {
        resolve(response.access_token);
      }
    };

    // Check if already has valid token
    const token = (window as any).gapi?.client?.getToken();
    if (token && token.access_token) {
      resolve(token.access_token);
    } else {
      // Request new token
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  });
};

/**
 * Create a calendar event
 */
export const createCalendarEvent = async (
  calendarId: string,
  event: CalendarEvent
): Promise<string> => {
  try {
    if (!gapiInited) {
      await initGoogleCalendar();
    }

    // Get access token
    await getAccessToken();

    const response = await (window as any).gapi.client.calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: 'all' // Send email notifications to attendees
    });

    console.log('✅ Calendar event created:', response.result.id);
    return response.result.id;
  } catch (error) {
    console.error('❌ Error creating calendar event:', error);
    throw error;
  }
};

/**
 * Update a calendar event
 */
export const updateCalendarEvent = async (
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<void> => {
  try {
    if (!gapiInited) {
      await initGoogleCalendar();
    }

    await getAccessToken();

    await (window as any).gapi.client.calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      resource: event,
      sendUpdates: 'all'
    });

    console.log('✅ Calendar event updated:', eventId);
  } catch (error) {
    console.error('❌ Error updating calendar event:', error);
    throw error;
  }
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (
  calendarId: string,
  eventId: string
): Promise<void> => {
  try {
    if (!gapiInited) {
      await initGoogleCalendar();
    }

    await getAccessToken();

    await (window as any).gapi.client.calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
      sendUpdates: 'all'
    });

    console.log('✅ Calendar event deleted:', eventId);
  } catch (error) {
    console.error('❌ Error deleting calendar event:', error);
    throw error;
  }
};

/**
 * Create calendar events for both trainer and student
 */
export const createBookingCalendarEvents = async (
  trainerEmail: string,
  studentEmail: string,
  eventTypeName: string,
  trainerName: string,
  studentName: string,
  startTime: Date,
  endTime: Date,
  note?: string
): Promise<{ trainerEventId: string; studentEventId: string }> => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Event for trainer's calendar
  const trainerEvent: CalendarEvent = {
    summary: `${eventTypeName} - ${studentName}`,
    description: `Session with ${studentName}\nEmail: ${studentEmail}\n${note ? `Note: ${note}` : ''}`,
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

  // Event for student's calendar
  const studentEvent: CalendarEvent = {
    summary: `${eventTypeName} with ${trainerName}`,
    description: `Session with trainer ${trainerName}\nTrainer Email: ${trainerEmail}\n${note ? `Note: ${note}` : ''}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: timeZone
    },
    attendees: [
      { email: trainerEmail, displayName: trainerName }
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 }
      ]
    }
  };

  try {
    // Create event on trainer's calendar
    const trainerEventId = await createCalendarEvent(trainerEmail, trainerEvent);

    // Create event on student's calendar
    const studentEventId = await createCalendarEvent(studentEmail, studentEvent);

    return { trainerEventId, studentEventId };
  } catch (error) {
    console.error('❌ Error creating booking calendar events:', error);
    throw error;
  }
};

/**
 * Delete booking calendar events for both trainer and student
 */
export const deleteBookingCalendarEvents = async (
  trainerEmail: string,
  studentEmail: string,
  trainerEventId?: string,
  studentEventId?: string
): Promise<void> => {
  try {
    const promises: Promise<void>[] = [];

    if (trainerEventId) {
      promises.push(deleteCalendarEvent(trainerEmail, trainerEventId));
    }

    if (studentEventId) {
      promises.push(deleteCalendarEvent(studentEmail, studentEventId));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('❌ Error deleting booking calendar events:', error);
    throw error;
  }
};
