import React from 'react';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { Badge } from '../ui/Common';
import { Booking, BlockedSlot, ExternalBooking, User } from '../../types';

interface MasterScheduleGridProps {
  selectedDate: Date;
  trainers: User[];
  trainerFilter: string;
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
  onBookingSelect: (booking: Booking) => void;
}

export const MasterScheduleGrid = ({
  selectedDate,
  trainers,
  trainerFilter,
  bookings,
  blockedSlots,
  externalBookings,
  onBookingSelect
}: MasterScheduleGridProps) => {
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));
  const visibleTrainers = trainerFilter === 'all'
    ? trainers
    : trainers.filter(t => t.id === trainerFilter);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px]">
        <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b" style={{ backgroundColor: '#fedac2' }}>
          <div className="p-3 font-semibold border-r" style={{ color: '#fc5d01' }}>Trainer</div>
          {next7Days.map(day => (
            <div
              key={day.toString()}
              className={`p-3 text-center border-r font-medium ${
                isSameDay(day, new Date())
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-300'
                  : ''
              }`}
            >
              <div className="font-bold">{format(day, 'EEE')}</div>
              <div className="text-xs text-slate-500">{format(day, 'MMM d')}</div>
            </div>
          ))}
        </div>
        {visibleTrainers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No trainers found.</p>
          </div>
        ) : (
          visibleTrainers.map(trainer => {
            const trainerBookingsCount = bookings.filter(b =>
              b.trainerId === trainer.id && b.status === 'confirmed'
            ).length;

            return (
              <div key={trainer.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-0 hover:bg-slate-50/30 transition-colors">
                <div className="p-3 border-r">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm" style={{ color: '#fc5d01' }}>
                      {trainer.name}
                    </div>
                    <div className="text-xs text-slate-500">{trainer.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        className="text-xs px-2 py-0.5"
                        style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}
                      >
                        {trainerBookingsCount} bookings
                      </Badge>
                      {trainer.googleCalendarConnected && (
                        <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
                          GCal
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {next7Days.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isBlocked = blockedSlots.some(b => b.trainerId === trainer.id && b.date === dateKey);
                  const dayBookings = bookings.filter(b =>
                    b.trainerId === trainer.id &&
                    isSameDay(parseISO(b.startTime), day) &&
                    b.status === 'confirmed'
                  );
                  const dayExternal = externalBookings.filter(ex =>
                    ex.trainerId === trainer.id &&
                    isSameDay(new Date(ex.start), day)
                  );

                  const totalEvents = dayBookings.length + dayExternal.length;

                  return (
                    <div
                      key={day.toString()}
                      className={`p-2 border-r min-h-[100px] text-xs relative ${
                        isBlocked ? 'bg-red-50/50' : ''
                      } ${isSameDay(day, new Date()) ? 'bg-blue-50/30' : ''}`}
                    >
                      {isBlocked && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <span
                            className="px-2 py-1 rounded text-xs font-bold transform -rotate-12 shadow-sm"
                            style={{ backgroundColor: '#fc5d01', color: '#ffffff' }}
                          >
                            BLOCKED
                          </span>
                        </div>
                      )}

                      {totalEvents > 0 && !isBlocked && (
                        <div className="absolute top-1 right-1 z-10">
                          <Badge
                            className="text-xs px-1.5 py-0.5 font-bold"
                            style={{ backgroundColor: '#fc5d01', color: '#ffffff' }}
                          >
                            {totalEvents}
                          </Badge>
                        </div>
                      )}

                      <div className="space-y-1 relative z-10">
                        {dayBookings.map(b => (
                          <div
                            key={b.id}
                            className="bg-blue-100 text-blue-800 p-1.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
                            onClick={() => onBookingSelect(b)}
                            title={`Click for details\n${format(parseISO(b.startTime), 'HH:mm')} - ${format(parseISO(b.endTime), 'HH:mm')}\n${b.studentName}\n${b.studentEmail}`}
                          >
                            <div className="font-semibold">{format(parseISO(b.startTime), 'HH:mm')}</div>
                            <div className="truncate text-[10px]">{b.studentName}</div>
                          </div>
                        ))}
                        {dayExternal.map(ex => (
                          <div
                            key={ex.id}
                            className="bg-slate-200 text-slate-700 p-1.5 rounded border border-slate-300 italic"
                            title={`External Event\n${format(new Date(ex.start), 'HH:mm')}`}
                          >
                            <div className="font-semibold text-[10px]">GCal</div>
                            <div className="truncate text-[10px]">{format(new Date(ex.start), 'HH:mm')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};