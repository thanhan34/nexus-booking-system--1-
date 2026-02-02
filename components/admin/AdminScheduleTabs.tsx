import React from 'react';
import { Calendar } from 'lucide-react';
import { Booking, BlockedSlot, ExternalBooking, EventType, User } from '../../types';
import { MasterScheduleView } from './MasterScheduleView';
import { TrainerSupportFinder } from './TrainerSupportFinder';

interface AdminScheduleTabsProps {
  trainers: User[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
  eventTypes: EventType[];
  adminId?: string;
  isSupportOnly?: boolean;
}

export const AdminScheduleTabs = ({
  trainers,
  bookings,
  blockedSlots,
  externalBookings,
  eventTypes,
  adminId,
  isSupportOnly = false
}: AdminScheduleTabsProps) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Trainer Schedules</h2>
      <MasterScheduleView
        trainers={trainers}
        bookings={bookings}
        blockedSlots={blockedSlots}
        externalBookings={externalBookings}
      />
    </div>
    {adminId && (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5" style={{ color: '#fc5d01' }} />
          <h2 className="text-2xl font-bold text-slate-800">
            {isSupportOnly ? 'Support Assist Finder' : 'Trainer Support Availability'}
          </h2>
        </div>
        <TrainerSupportFinder
          adminId={adminId}
          trainers={trainers}
          bookings={bookings}
          blockedSlots={blockedSlots}
          externalBookings={externalBookings}
          eventTypes={eventTypes}
        />
      </div>
    )}
  </div>
);