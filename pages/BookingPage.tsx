
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataStore } from '../store';
import { generateAvailableSlots } from '../utils/availability';
import { Card, Button, Input } from '../components/ui/Common';
import { Calendar as CalendarIcon, Clock, ChevronLeft, Check, User as UserIcon } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { z } from 'zod';
import { GeneratedTimeSlot } from '../types';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const eventType = eventTypes.find(e => e.id === eventTypeId);
  const requestedTrainer = requestedTrainerId ? trainers.find(t => t.id === requestedTrainerId) : null;

  useEffect(() => {
    if (eventType && trainers.length > 0) {
      const availableSlots = generateAvailableSlots(
        selectedDate, 
        eventType, 
        trainers, 
        bookings, 
        blockedSlots, 
        externalBookings, 
        requestedTrainerId || undefined
      );
      setSlots(availableSlots);
    }
  }, [selectedDate, eventType, trainers, bookings, blockedSlots, externalBookings, requestedTrainerId]);

  const handleSlotSelect = (slot: GeneratedTimeSlot) => {
    setSelectedSlot(slot);
    setStep(2);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        status: 'confirmed'
      });
      navigate(`/success/${booking.id}`);
      toast.success("Booking confirmed!");
    } catch (error) {
      toast.error("Failed to create booking");
    }
  };

  if (!eventType) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-accent" onClick={() => step > 1 ? setStep(step - 1 as any) : (requestedTrainer ? navigate(`/trainer/${requestedTrainer.slug}`) : navigate('/'))}>
        <ChevronLeft className="w-4 h-4 mr-1" />
        {step === 1 ? 'Back' : 'Change Time'}
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Event Summary Side Panel */}
        <div className="md:col-span-1">
          <Card className="p-6 sticky top-24 bg-slate-50 border-none shadow-none">
            <h2 className="text-xl font-bold mb-4">{eventType.name}</h2>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-3" />
                {eventType.durationMinutes} minutes
              </div>
              {requestedTrainer && (
                <div className="flex items-center">
                  <UserIcon className="w-4 h-4 mr-3" />
                  with {requestedTrainer.name}
                </div>
              )}
              {selectedSlot && (
                <div className="flex items-center text-primary font-medium">
                  <CalendarIcon className="w-4 h-4 mr-3" />
                  {format(selectedSlot.start, 'EEEE, MMMM d')}
                  <br />
                  {format(selectedSlot.start, 'HH:mm')} - {format(selectedSlot.end, 'HH:mm')}
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
                <h3 className="text-lg font-semibold mb-4">Select Time</h3>
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                    No slots available for this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots.map((slot, idx) => {
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
                          {format(slot.start, 'HH:mm')}
                        </button>
                      );
                    })}
                  </div>
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
                  <Button type="submit" className="w-full">Confirm Booking</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
