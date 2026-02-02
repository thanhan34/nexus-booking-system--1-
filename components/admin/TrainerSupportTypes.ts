import { Booking, User } from '../../types';

export interface SupportSlot {
  trainer: User;
  booking: Booking;
  start: Date;
  end: Date;
  timeLabel: string;
}

export interface SupportSlotDetails {
  trainer: User;
  start: Date;
  end: Date;
}