import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataStore } from '../store';
import { generateAvailableSlots } from '../utils/availability';
import { Button } from '../components/ui/Common';
import { ChevronLeft } from 'lucide-react';
import { startOfToday } from 'date-fns';
import { z } from 'zod';
import { GeneratedTimeSlot } from '../types';
import toast from 'react-hot-toast';
import {
  getUserTimezone,
  getTimezoneDisplayName,
  formatSystemTimeInUserTimezone,
  isDifferentTimezone,
  getTimezones,
  getTimezoneOptionLabel,
  SYSTEM_TIMEZONE
} from '../utils/timezone';
import { sendBookingNotificationToDiscord } from '../services/discord';
import { BookingMiniCalendar } from '../components/booking/BookingMiniCalendar';
import { BookingEventSummary } from '../components/booking/BookingEventSummary';
import { BookingTimezoneSelect } from '../components/booking/BookingTimezoneSelect';
import { BookingDetailsForm } from '../components/booking/BookingDetailsForm';

const bookingSchema = z.object({
  studentName: z.string().min(2, "Name required"),
  studentEmail: z.string().email("Invalid email"),
  studentPhone: z.string().min(8, "Phone required"),
  studentCode: z.string().optional(),
  note: z.string().optional()
});

export const BookingPage = () => {
  const { eventTypeId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedTrainerId = searchParams.get('trainerId');
  const navigate = useNavigate();
  const { eventTypes, trainers, bookings, blockedSlots, externalBookings, fetchData, addBooking } = useDataStore();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<GeneratedTimeSlot | null>(null);
  const [slots, setSlots] = useState<GeneratedTimeSlot[]>([]);
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
    studentCode: '',
    note: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Timezone handling
  const [userTimezone, setUserTimezone] = useState(getUserTimezone());
  const timezoneOptions = useMemo(() => getTimezones(), []);
  const showDifferentTimezone = isDifferentTimezone(userTimezone);
  const userTimezoneDisplay = getTimezoneDisplayName(userTimezone);
  const systemTimezoneDisplay = getTimezoneDisplayName(SYSTEM_TIMEZONE);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const eventType = eventTypes.find(e => e.id === eventTypeId);
  const requestedTrainer = requestedTrainerId ? trainers.find(t => t.id === requestedTrainerId) : null;

  // Debug logging
  useEffect(() => {
    console.log('📊 [BookingPage] Data loaded:', {
      eventTypes: eventTypes.length,
      trainers: trainers.length,
      bookings: bookings.length,
      blockedSlots: blockedSlots.length,
      eventTypeId,
      requestedTrainerId,
      requestedTrainer: requestedTrainer?.name
    });
  }, [eventTypes, trainers, bookings, blockedSlots, eventTypeId, requestedTrainerId, requestedTrainer]);

  useEffect(() => {
    if (eventType && trainers.length > 0) {
      console.log('🔄 [BookingPage] Generating slots for:', {
        date: selectedDate,
        eventType: eventType.name,
        trainersCount: trainers.length,
        bookingsCount: bookings.length,
        requestedTrainerId
      });
      
      const availableSlots = generateAvailableSlots(
        selectedDate, 
        eventType, 
        trainers, 
        bookings, 
        blockedSlots, 
        externalBookings, 
        requestedTrainerId || undefined
      );
      
      console.log('✅ [BookingPage] Generated slots:', availableSlots.length);
      setSlots(availableSlots);
    }
  }, [selectedDate, eventType, trainers, bookings, blockedSlots, externalBookings, requestedTrainerId, userTimezone]);

  const handleSlotSelect = (slot: GeneratedTimeSlot) => {
    setSelectedSlot(slot);
    setStep(2);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleTimezoneChange = (timezone: string) => {
    setUserTimezone(timezone);
  };

  const displaySlots = useMemo(() => (
    slots
      .map(slot => ({
        slot,
        displayTime: formatSystemTimeInUserTimezone(slot.start, 'HH:mm', userTimezone)
      }))
      .sort((a, b) => a.displayTime.localeCompare(b.displayTime))
  ), [slots, userTimezone]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ [BOOKING] Preventing double submission');
      return;
    }
    
    const result = bookingSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!selectedSlot || !eventType) return;

    try {
      setIsSubmitting(true);
      console.log('🚀 [BOOKING] Starting booking creation...');
      
      const booking = await addBooking({
        eventTypeId: eventType.id,
        trainerId: selectedSlot.trainerId,
        studentName: formData.studentName,
        studentEmail: formData.studentEmail,
        studentPhone: formData.studentPhone,
        studentCode: formData.studentCode,
        note: formData.note,
        startTime: selectedSlot.start.toISOString(),
        endTime: selectedSlot.end.toISOString(),
        status: 'confirmed',
        studentTimezone: userTimezone // Lưu timezone của học viên
      });
      
      console.log('✅ [BOOKING] Booking created successfully:', booking.id);
      
      // Gửi thông báo Discord
      const trainer = trainers.find(t => t.id === selectedSlot.trainerId);
      if (trainer) {
        console.log('📬 [DISCORD] Sending notification...');
        sendBookingNotificationToDiscord({
          booking,
          eventType,
          trainer
        }).catch(err => {
          console.error('❌ [DISCORD] Failed to send notification:', err);
          // Không làm gián đoạn flow, chỉ log lỗi
        });
      }
      
      navigate(`/success/${booking.id}`);
      toast.success("Booking confirmed!");
    } catch (error) {
      console.error('❌ [BOOKING] Failed to create booking:', error);
      toast.error("Failed to create booking");
      setIsSubmitting(false);
    }
  };

  if (!eventType) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img 
          src="/images/white_logo-removebg-preview.png" 
          alt="PTE Intensive Logo" 
          className="h-48 w-auto object-contain"
        />
      </div>

      <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-accent" onClick={() => step > 1 ? setStep(step - 1 as any) : (requestedTrainer ? navigate(`/trainer/${requestedTrainer.slug}`) : navigate('/'))}>
        <ChevronLeft className="w-4 h-4 mr-1" />
        {step === 1 ? 'Back' : 'Change Time'}
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Event Summary Side Panel */}
        <div className="md:col-span-1">
          <BookingEventSummary
            eventType={eventType}
            requestedTrainer={requestedTrainer}
            selectedSlot={selectedSlot}
            userTimezone={userTimezone}
            userTimezoneDisplay={userTimezoneDisplay}
            showDifferentTimezone={showDifferentTimezone}
          />
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Date</h3>
                <BookingMiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Time</h3>
                  {showDifferentTimezone && (
                    <div className="flex items-center text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      <span>{getTimezoneOptionLabel(userTimezone)}</span>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <BookingTimezoneSelect
                    value={userTimezone}
                    timezones={timezoneOptions}
                    onChange={handleTimezoneChange}
                  />
                </div>
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                    No slots available for this date.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {displaySlots.map(({ slot, displayTime }, idx) => {
                        const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSlotSelect(slot)}
                            className={`py-2 px-3 text-sm font-medium rounded-md border transition-all ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                : 'border-slate-200 hover:border-accent hover:text-accent'
                            }`}
                          >
                            {displayTime}
                          </button>
                        );
                      })}
                    </div>
                    {showDifferentTimezone && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <span className="font-medium">📍 Lưu ý:</span> Thời gian hiển thị đã được chuyển đổi sang múi giờ của bạn ({userTimezoneDisplay}).
                          Hệ thống lưu trữ theo giờ Vietnam ({systemTimezoneDisplay}).
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <BookingDetailsForm
              formData={formData}
              errors={errors}
              isSubmitting={isSubmitting}
              onChange={handleFormChange}
              onSubmit={handleFormSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
};
