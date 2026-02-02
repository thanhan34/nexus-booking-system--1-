import React, { useMemo, useState } from 'react';
import { addDays, format, isSameDay, parseISO, startOfToday } from 'date-fns';
import { Phone, Mail, Users } from 'lucide-react';
import { Booking, BlockedSlot, ExternalBooking, User } from '../../types';
import { Button, Card, Select, Badge } from '../ui/Common';
import { generateAvailableSlots } from '../../utils/availability';

interface TrainerSupportFinderProps {
  adminId: string;
  trainers: User[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
}

const WEEK_DAYS = 7;

const toMinutes = (startTime: string, endTime: string) => (
  Math.round((parseISO(endTime).getTime() - parseISO(startTime).getTime()) / 60000)
);

export const TrainerSupportFinder = ({
  adminId,
  trainers,
  bookings,
  blockedSlots,
  externalBookings
}: TrainerSupportFinderProps) => {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [trainerFilter, setTrainerFilter] = useState('all');

  const next7Days = useMemo(() => Array.from({ length: WEEK_DAYS }, (_, i) => addDays(selectedDate, i)), [selectedDate]);

  const adminBookings = useMemo(() => (
    bookings.filter(b => b.trainerId === adminId && b.status === 'confirmed')
  ), [bookings, adminId]);

  const adminExternal = useMemo(() => (
    externalBookings.filter(ex => ex.trainerId === adminId)
  ), [externalBookings, adminId]);

  const visibleTrainers = trainerFilter === 'all'
    ? trainers.filter(t => t.id !== adminId)
    : trainers.filter(t => t.id === trainerFilter && t.id !== adminId);

  const freeSlotMap = useMemo(() => {
    const map: Record<string, Record<string, string[]>> = {};
    const adminBookingsByDay = next7Days.reduce<Record<string, Booking[]>>((acc, day) => {
      const key = format(day, 'yyyy-MM-dd');
      acc[key] = adminBookings.filter(b => isSameDay(parseISO(b.startTime), day));
      return acc;
    }, {});

    visibleTrainers.forEach(trainer => {
      const trainerBookings = bookings.filter(b => b.trainerId === trainer.id && b.status === 'confirmed');
      const trainerExternal = externalBookings.filter(ex => ex.trainerId === trainer.id);
      const trainerBlocked = blockedSlots.filter(slot => slot.trainerId === trainer.id);

      map[trainer.id] = {};

      next7Days.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const adminDayBookings = adminBookingsByDay[dayKey] || [];

        if (adminDayBookings.length === 0) {
          map[trainer.id][dayKey] = [];
          return;
        }

        const daySlots: string[] = [];

        adminDayBookings.forEach(booking => {
          if (!booking.eventTypeId) {
            return;
          }

          const eventType = {
            id: booking.eventTypeId,
            name: 'Admin Session',
            description: '',
            durationMinutes: toMinutes(booking.startTime, booking.endTime),
            color: '#fc5d01',
            active: true
          };

          const availableSlots = generateAvailableSlots(
            day,
            eventType,
            [trainer],
            trainerBookings,
            trainerBlocked,
            trainerExternal
          );

          const bookingStart = parseISO(booking.startTime).getTime();
          const matchingSlot = availableSlots.find(slot => slot.start.getTime() === bookingStart);
          if (matchingSlot) {
            daySlots.push(format(matchingSlot.start, 'HH:mm'));
          }
        });

        map[trainer.id][dayKey] = Array.from(new Set(daySlots));
      });
    });

    return map;
  }, [
    visibleTrainers,
    next7Days,
    bookings,
    externalBookings,
    blockedSlots,
    adminBookings,
    adminExternal,
    adminId
  ]);

  return (
    <div className="space-y-6">
      <Card className="p-4" style={{ borderColor: '#fedac2' }}>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" style={{ color: '#fc5d01' }} />
            <div>
              <h3 className="font-semibold" style={{ color: '#fc5d01' }}>Trainer Support Finder</h3>
              <p className="text-xs text-slate-500">Tìm trainer rảnh trùng thời gian admin đang dạy</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={trainerFilter}
              onChange={e => setTrainerFilter(e.target.value)}
              className="h-9 text-xs"
              style={{ borderColor: '#fdbc94' }}
            >
              <option value="all">All Trainers</option>
              {trainers.filter(t => t.id !== adminId).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                style={{ borderColor: '#fdbc94', color: '#fc5d01' }}
              >
                Prev Week
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedDate(startOfToday())}
                style={{ backgroundColor: '#fc5d01' }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                style={{ borderColor: '#fdbc94', color: '#fc5d01' }}
              >
                Next Week
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
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
          <div className="p-8 text-center text-slate-500">No trainers available.</div>
        ) : (
          visibleTrainers.map(trainer => (
            <div key={trainer.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-0">
              <div className="p-3 border-r">
                <div className="font-medium text-sm" style={{ color: '#fc5d01' }}>{trainer.name}</div>
                <div className="text-xs text-slate-500">{trainer.email}</div>
                <div className="flex gap-2 mt-2">
                  <Badge className="text-[10px] px-2 py-0.5" style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}>
                    Support
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Mail className="w-3 h-3" />
                    <span>Email</span>
                  </div>
                </div>
              </div>
              {next7Days.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const slots = freeSlotMap[trainer.id]?.[dayKey] || [];
                return (
                  <div key={dayKey} className="p-2 border-r min-h-[100px] text-xs">
                    {slots.length === 0 ? (
                      <div className="text-slate-400 italic">No overlap</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {slots.map(slot => (
                          <span
                            key={`${trainer.id}-${dayKey}-${slot}`}
                            className="px-2 py-1 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: '#ffac7b', color: '#ffffff' }}
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </Card>
    </div>
  );
};