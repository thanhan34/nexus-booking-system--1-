export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  availability?: AvailabilitySlot[];
  slug?: string;
  googleCalendarConnected?: boolean;
  googleCalendarEmail?: string;
  googleRefreshToken?: string; // Only store refresh token, never access token
  calendarDisconnectedReason?: 'invalid_grant' | 'revoked' | 'network_error';
  calendarDisconnectedAt?: string; // ISO timestamp
  eventTypes?: string[];
  photoUrl?: string;
  zoomMeetingLink?: string;
}

export interface WeeklyAvailability {
  [day: string]: TimeRange;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface GeneratedTimeSlot {
  start: Date;
  end: Date;
  trainerId: string;
}

export interface AvailabilitySlot {
  day: string;
  active: boolean;
  timeSlots: TimeSlot[];
}

export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  color: string;
  active: boolean;
}

export interface Booking {
  id: string;
  eventTypeId?: string;
  trainerId: string;
  startTime: string;
  endTime: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentCode?: string;
  note?: string;
  status: string;
  supportTrainerId?: string;
  supportTrainerEmail?: string;
  supportAssignedAt?: string;
  studentTimezone?: string; // Timezone của học viên để tạo calendar event đúng
  isRecurring?: boolean;
  calendarEventId?: string; // Google Calendar event ID (on trainer's calendar with student as attendee)
  recurringGroupId?: string; // For recurring bookings
}

export interface BlockedSlot {
  trainerId: string;
  date: string;
}

export interface ExternalBooking {
  id: string;
  start: string;
  trainerId: string;
  title?: string;
}
