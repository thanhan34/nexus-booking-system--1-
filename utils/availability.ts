
import { User, EventType, Booking, GeneratedTimeSlot, BlockedSlot, ExternalBooking } from '../types';
import { addMinutes, format, parse, isSameDay, isAfter, isBefore, setHours, setMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { SYSTEM_TIMEZONE } from './timezone';

export const generateAvailableSlots = (
  date: Date,
  eventType: EventType,
  trainers: User[],
  bookings: Booking[],
  blockedSlots: BlockedSlot[] = [],
  externalBookings: ExternalBooking[] = [],
  specificTrainerId?: string
): GeneratedTimeSlot[] => {
  const dayName = format(date, 'eeee').toLowerCase();
  const dateString = format(date, 'yyyy-MM-dd');
  const slots: GeneratedTimeSlot[] = [];

  console.log('🔍 [generateAvailableSlots] Date:', dateString, 'Day:', dayName);
  console.log('🔍 [generateAvailableSlots] Event Type:', eventType.name);
  console.log('🔍 [generateAvailableSlots] Trainers:', trainers.map(t => ({ id: t.id, name: t.name, eventTypes: t.eventTypes, availability: t.availability })));

  // Filter trainers who can handle this event type
  // If trainer has no eventTypes defined, they can teach all event types
  let qualifiedTrainers = trainers.filter(t => 
    !t.eventTypes || t.eventTypes.length === 0 || t.eventTypes.includes(eventType.id)
  );

  console.log('✅ [generateAvailableSlots] Qualified trainers:', qualifiedTrainers.map(t => t.name));

  // If a specific trainer is requested, filter down to just them
  if (specificTrainerId) {
    qualifiedTrainers = qualifiedTrainers.filter(t => t.id === specificTrainerId);
    console.log('🎯 [generateAvailableSlots] Filtered to specific trainer:', specificTrainerId);
  }

  qualifiedTrainers.forEach(trainer => {
    console.log('👤 [generateAvailableSlots] Processing trainer:', trainer.name);
    
    // 1. Check if the trainer is blocked for this entire day
    const isDayBlocked = blockedSlots.some(b => 
      b.trainerId === trainer.id && 
      b.date === dateString
    );
    if (isDayBlocked) {
      console.log('🚫 [generateAvailableSlots] Day is blocked for trainer:', trainer.name);
      return;
    }

    // 2. Check weekly availability
    const dayAvailability = trainer.availability?.find(a => a.day === dayName && a.active);
    if (!dayAvailability || !dayAvailability.timeSlots || dayAvailability.timeSlots.length === 0) {
      console.log('❌ [generateAvailableSlots] No availability for', dayName, 'for trainer:', trainer.name);
      return;
    }

    console.log('📅 [generateAvailableSlots] Found', dayAvailability.timeSlots.length, 'time slots for', trainer.name);

    // Process each time slot for this day
    dayAvailability.timeSlots.forEach((timeSlot, slotIndex) => {
      console.log(`  ⏰ [Slot ${slotIndex + 1}] ${timeSlot.start} - ${timeSlot.end}`);
      
      const startHour = parseInt(timeSlot.start.split(':')[0]);
      const startMinute = parseInt(timeSlot.start.split(':')[1]);
      const endHour = parseInt(timeSlot.end.split(':')[0]);
      const endMinute = parseInt(timeSlot.end.split(':')[1]);

      // Tạo slots trong SYSTEM_TIMEZONE (GMT+7), không phải local timezone
      // Tạo date string trong system timezone
      const dateStr = format(date, 'yyyy-MM-dd');
      const startTimeStr = `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
      const endTimeStr = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
      
      // Convert từ system timezone sang UTC (để lưu trữ đúng)
      let currentSlotStart = fromZonedTime(startTimeStr, SYSTEM_TIMEZONE);
      const dayEnd = fromZonedTime(endTimeStr, SYSTEM_TIMEZONE);

      while (isBefore(addMinutes(currentSlotStart, eventType.durationMinutes), dayEnd) || 
             addMinutes(currentSlotStart, eventType.durationMinutes).getTime() === dayEnd.getTime()) {
        const currentSlotEnd = addMinutes(currentSlotStart, eventType.durationMinutes);
        
        // 3. Check for internal booking conflicts
        const isConflicted = bookings.some(booking => {
          if (booking.trainerId !== trainer.id) return false;
          if (booking.status === 'cancelled') return false;
          
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          // Add buffer to booking end (if exists)
          const bufferMinutes = (eventType as any).bufferMinutes || 0;
          const bookingEndWithBuffer = addMinutes(bookingEnd, bufferMinutes);

          // Simple overlap check
          return isBefore(currentSlotStart, bookingEndWithBuffer) && isAfter(currentSlotEnd, bookingStart);
        });

        // 4. Check for external calendar conflicts (e.g. Google Calendar)
        const isExternalConflicted = externalBookings.some(ex => {
          if (ex.trainerId !== trainer.id) return false;
          
          const exStart = new Date(ex.start);
          const exEnd = new Date((ex as any).end || addMinutes(exStart, 60));

          return isBefore(currentSlotStart, exEnd) && isAfter(currentSlotEnd, exStart);
        });

        if (!isConflicted && !isExternalConflicted) {
          slots.push({
            start: currentSlotStart,
            end: currentSlotEnd,
            trainerId: trainer.id
          });
          console.log(`    ✅ Available: ${format(currentSlotStart, 'HH:mm')} - ${format(currentSlotEnd, 'HH:mm')}`);
        } else {
          console.log(`    ❌ Conflicted: ${format(currentSlotStart, 'HH:mm')} - ${format(currentSlotEnd, 'HH:mm')}`);
        }

        // Increment by 30 mins or duration for next slot check
        currentSlotStart = addMinutes(currentSlotStart, 30);
      }
    });
  });

  console.log('🎉 [generateAvailableSlots] Total slots generated:', slots.length);
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
};
