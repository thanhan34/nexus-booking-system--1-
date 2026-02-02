import React, { useMemo, useState } from 'react';
import { addDays, format, isSameDay, parseISO, startOfToday } from 'date-fns';
import { Users } from 'lucide-react';
import { Booking, BlockedSlot, ExternalBooking, EventType, User } from '../../types';
import { Button, Card, Select } from '../ui/Common';
import { generateAvailableSlots } from '../../utils/availability';
import { SYSTEM_TIMEZONE } from '../../utils/timezone';
import { createCalendarEvent } from '../../services/calendar';
import toast from 'react-hot-toast';
import { SupportSlot } from './TrainerSupportTypes';
import { TrainerSupportDialog } from './TrainerSupportDialog';
import { TrainerSupportGrid } from './TrainerSupportGrid';

interface TrainerSupportFinderProps {
  adminId: string;
  trainers: User[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
  eventTypes: EventType[];
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
  externalBookings,
  eventTypes
}: TrainerSupportFinderProps) => {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState<SupportSlot | null>(null);
  const [saving, setSaving] = useState(false);

  const next7Days = useMemo(() => Array.from({ length: WEEK_DAYS }, (_, i) => addDays(selectedDate, i)), [selectedDate]);

  const adminBookings = useMemo(() => (
    bookings.filter(b => b.trainerId === adminId && b.status === 'confirmed')
  ), [bookings, adminId]);

  const adminUser = useMemo(() => (
    trainers.find(t => t.id === adminId)
  ), [trainers, adminId]);

  const visibleTrainers = trainerFilter === 'all'
    ? trainers.filter(t => t.id !== adminId)
    : trainers.filter(t => t.id === trainerFilter && t.id !== adminId);

  const freeSlotMap = useMemo(() => {
    const map: Record<string, Record<string, SupportSlot[]>> = {};
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

        const daySlots: SupportSlot[] = [];

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
            daySlots.push({
              trainer,
              booking,
              start: parseISO(booking.startTime),
              end: parseISO(booking.endTime),
              timeLabel: format(matchingSlot.start, 'HH:mm')
            });
          }
        });

        map[trainer.id][dayKey] = daySlots;
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
    adminId
  ]);

  const handleCreateEvent = async () => {
    if (!selectedSlot) {
      return;
    }

    if (!selectedSlot.trainer.googleCalendarConnected) {
      toast.error('Trainer chưa kết nối Google Calendar');
      return;
    }

    try {
      setSaving(true);
      const eventTypeName = eventTypes.find(et => et.id === selectedSlot.booking.eventTypeId)?.name || 'Admin Session';
      const adminName = adminUser?.name || 'Admin';
      const adminEmail = adminUser?.email;

      const descriptionLines = [
        `Hỗ trợ admin: ${adminName}`,
        adminEmail ? `Email admin: ${adminEmail}` : undefined,
        `Mã booking admin: ${selectedSlot.booking.id}`,
        `Loại buổi học: ${eventTypeName}`,
        `Thời gian: ${format(selectedSlot.start, 'yyyy-MM-dd HH:mm')} - ${format(selectedSlot.end, 'HH:mm')}`
      ].filter(Boolean);

      await createCalendarEvent(selectedSlot.trainer.id, {
        summary: `Support Session - ${adminName}`,
        description: descriptionLines.join('\n'),
        start: {
          dateTime: selectedSlot.start.toISOString(),
          timeZone: SYSTEM_TIMEZONE
        },
        end: {
          dateTime: selectedSlot.end.toISOString(),
          timeZone: SYSTEM_TIMEZONE
        },
        attendees: adminEmail ? [{ email: adminEmail, displayName: adminName }] : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      });

      toast.success('Đã thêm event vào Google Calendar của trainer');
      setSelectedSlot(null);
    } catch (error: any) {
      console.error('❌ Failed to create support event:', error);
      toast.error(error.message || 'Không thể tạo event Google Calendar');
    } finally {
      setSaving(false);
    }
  };

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

      <TrainerSupportGrid
        next7Days={next7Days}
        trainers={visibleTrainers}
        slotsByTrainer={freeSlotMap}
        onSlotSelect={setSelectedSlot}
      />

      <TrainerSupportDialog
        slot={selectedSlot}
        adminUser={adminUser}
        saving={saving}
        onClose={() => setSelectedSlot(null)}
        onConfirm={handleCreateEvent}
      />
    </div>
  );
};