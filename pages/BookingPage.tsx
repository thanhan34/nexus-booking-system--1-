
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataStore } from '../store';
import { generateAvailableSlots } from '../utils/availability';
import { Card, Button, Input } from '../components/ui/Common';
import { Calendar as CalendarIcon, Clock, ChevronLeft, Check, User as UserIcon, Globe } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { z } from 'zod';
import { GeneratedTimeSlot } from '../types';
import toast from 'react-hot-toast';
import { 
  getUserTimezone, 
  getTimezoneDisplayName, 
  isDifferentTimezone,
  formatSystemTimeInUserTimezone,
  SYSTEM_TIMEZONE
} from '../utils/timezone';
import { sendBookingNotificationToDiscord } from '../services/discord';

// Simple Calendar Component
const MiniCalendar = ({ selectedDate, onSelectDate }: { selectedDate: Date, onSelectDate: (d: Date) => void }) => {
  const today = startOfToday();
  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {next14Days.map((date) => {
        const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
        return (
          <button
            key={date.toISOString()}
            onClick={() => onSelectDate(date)}
            className={`p-2 text-center rounded-md text-sm transition-colors ${
              isSelected 
                ? 'bg-slate-900 text-white' 
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="font-medium text-xs uppercase text-opacity-70 mb-1">{format(date, 'EEE')}</div>
            <div className="font-bold text-lg">{format(date, 'd')}</div>
          </button>
        );
      })}
    </div>
  );
};

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
  const [userTimezone] = useState(getUserTimezone());
  const [showDifferentTimezone] = useState(isDifferentTimezone(userTimezone));
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
  }, [selectedDate, eventType, trainers, bookings, blockedSlots, externalBookings, requestedTrainerId]);

  const handleSlotSelect = (slot: GeneratedTimeSlot) => {
    setSelectedSlot(slot);
    setStep(2);
  };

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
          <Card className="p-6 sticky top-24 bg-slate-50 border-none shadow-none">
            <h2 className="text-xl font-bold mb-4">{eventType.name}</h2>
            
            {/* Teacher Profile Section */}
            {requestedTrainer && (
              <div className="mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  {/* Profile Picture */}
                  <div className="relative flex-shrink-0">
                    {requestedTrainer.photoUrl ? (
                      <img 
                        src={requestedTrainer.photoUrl} 
                        alt={requestedTrainer.name || 'Teacher'} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-accent shadow-md"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-md ${requestedTrainer.photoUrl ? 'hidden' : 'flex'}`}
                    >
                      <UserIcon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  {/* Teacher Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-800 truncate">{requestedTrainer.name}</h3>
                    <p className="text-sm text-slate-600">Professional Trainer</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-3" />
                {eventType.durationMinutes} minutes
              </div>
              {selectedSlot && (
                <div className="text-primary font-medium">
                  <div className="flex items-start mb-2">
                    <CalendarIcon className="w-4 h-4 mr-3 mt-0.5" />
                    <div>
                      <div>{format(selectedSlot.start, 'EEEE, MMMM d')}</div>
                      <div className="mt-1">
                        {formatSystemTimeInUserTimezone(selectedSlot.start, 'HH:mm', userTimezone)} - {formatSystemTimeInUserTimezone(selectedSlot.end, 'HH:mm', userTimezone)}
                      </div>
                      {showDifferentTimezone && (
                        <div className="text-xs text-slate-500 mt-1">
                          {userTimezoneDisplay}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-6 text-sm text-slate-500">{eventType.description}</p>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Date</h3>
                <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Time</h3>
                  {showDifferentTimezone && (
                    <div className="flex items-center text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      <Globe className="w-3.5 h-3.5 mr-1.5" />
                      <span>{userTimezoneDisplay}</span>
                    </div>
                  )}
                </div>
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                    No slots available for this date.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {slots.map((slot, idx) => {
                        const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                        const displayTime = formatSystemTimeInUserTimezone(slot.start, 'HH:mm', userTimezone);
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
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h3 className="text-lg font-semibold mb-6">Enter Details</h3>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input 
                    value={formData.studentName}
                    onChange={e => setFormData({...formData, studentName: e.target.value})}
                    placeholder="John Smith"
                  />
                  {errors.studentName && <span className="text-xs text-red-500">{errors.studentName}</span>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input 
                      type="email"
                      value={formData.studentEmail}
                      onChange={e => setFormData({...formData, studentEmail: e.target.value})}
                      placeholder="john@example.com"
                    />
                    {errors.studentEmail && <span className="text-xs text-red-500">{errors.studentEmail}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <Input 
                      value={formData.studentPhone}
                      onChange={e => setFormData({...formData, studentPhone: e.target.value})}
                      placeholder="+1 234 567 890"
                    />
                    {errors.studentPhone && <span className="text-xs text-red-500">{errors.studentPhone}</span>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Student Code (Optional)</label>
                  <Input 
                    value={formData.studentCode}
                    onChange={e => setFormData({...formData, studentCode: e.target.value})}
                    placeholder="ST-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Note (Optional)</label>
                  <textarea 
                    className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    rows={3}
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Booking...' : 'Confirm Booking'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
