import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../store';
import { generateAvailableSlots } from '../utils/availability';
import { Card, Button } from '../components/ui/Common';
import { Calendar as CalendarIcon, Clock, User, AlertTriangle, ChevronLeft, Globe } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import toast from 'react-hot-toast';
import { GeneratedTimeSlot } from '../types';
import { 
  formatSystemTimeInUserTimezone, 
  getUserTimezone, 
  getTimezoneDisplayName, 
  SYSTEM_TIMEZONE 
} from '../utils/timezone';

// Mini Calendar Component
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

export const RescheduleBookingPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { bookings, eventTypes, trainers, blockedSlots, externalBookings, fetchData } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<GeneratedTimeSlot | null>(null);
  const [slots, setSlots] = useState<GeneratedTimeSlot[]>([]);
  const [userTimezone] = useState(getUserTimezone());
  const [showDifferentTimezone] = useState(userTimezone !== SYSTEM_TIMEZONE);
  const userTimezoneDisplay = getTimezoneDisplayName(userTimezone);

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      await fetchData();
      setDataLoading(false);
    };
    loadData();
  }, [fetchData]);

  const booking = bookings.find(b => b.id === bookingId);
  const eventType = booking ? eventTypes.find(et => et.id === booking.eventTypeId) : null;
  const trainer = booking ? trainers.find(t => t.id === booking.trainerId) : null;

  // Generate available slots when date changes
  useEffect(() => {
    if (eventType && trainer && trainers.length > 0) {
      const availableSlots = generateAvailableSlots(
        selectedDate,
        eventType,
        trainers,
        bookings.filter(b => b.id !== bookingId), // Exclude current booking
        blockedSlots,
        externalBookings,
        trainer.id
      );
      setSlots(availableSlots);
    }
  }, [selectedDate, eventType, trainer, trainers, bookings, blockedSlots, externalBookings, bookingId]);

  const handleReschedule = async () => {
    if (!booking || !bookingId || !selectedSlot) return;

    if (!window.confirm('Bạn có chắc chắn muốn đổi lịch học sang thời gian mới?')) {
      return;
    }

    setLoading(true);
    try {
      // For now, we'll cancel old booking and create new one
      // In future, could implement proper update with calendar event update
      await useDataStore.getState().updateBookingStatus(bookingId, 'cancelled');
      
      const newBooking = await useDataStore.getState().addBooking({
        eventTypeId: booking.eventTypeId!,
        trainerId: booking.trainerId,
        studentName: booking.studentName,
        studentEmail: booking.studentEmail,
        studentPhone: booking.studentPhone,
        studentCode: booking.studentCode,
        note: `Rescheduled from ${format(new Date(booking.startTime), 'dd/MM/yyyy HH:mm')}. ${booking.note || ''}`,
        startTime: selectedSlot.start.toISOString(),
        endTime: selectedSlot.end.toISOString(),
        status: 'confirmed',
        studentTimezone: booking.studentTimezone || userTimezone
      });

      toast.success('Đã đổi lịch học thành công!');
      navigate(`/success/${newBooking.id}`);
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      toast.error('Không thể đổi lịch học. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while fetching data
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Đang tải thông tin...</h2>
          <p className="text-gray-600">Vui lòng đợi trong giây lát</p>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Không tìm thấy booking</h2>
          <p className="text-gray-600 mb-6">
            Booking này không tồn tại hoặc đã bị xóa.
          </p>
          <Button onClick={() => navigate('/')}>Về trang chủ</Button>
        </Card>
      </div>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Booking đã bị hủy</h2>
          <p className="text-gray-600 mb-6">
            Booking này đã bị hủy và không thể đổi lịch.
          </p>
          <Button onClick={() => navigate('/')}>Về trang chủ</Button>
        </Card>
      </div>
    );
  }

  const currentStartTime = new Date(booking.startTime);
  const currentEndTime = new Date(booking.endTime);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/images/white_logo-removebg-preview.png" 
            alt="PTE Intensive Logo" 
            className="h-32 w-auto object-contain"
          />
        </div>

        <Button 
          variant="ghost" 
          className="mb-4 pl-0 hover:bg-transparent hover:text-accent" 
          onClick={() => navigate('/')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Booking Info */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Lịch học hiện tại</h2>
              
              {eventType && (
                <div className="mb-4">
                  <h3 className="font-semibold">{eventType.name}</h3>
                  <p className="text-sm text-gray-600">{eventType.durationMinutes} phút</p>
                </div>
              )}

              {trainer && (
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{trainer.name}</p>
                      <p className="text-sm text-gray-600">Giảng viên</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(currentStartTime, 'EEEE, dd/MM/yyyy')}
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {formatSystemTimeInUserTimezone(currentStartTime, 'HH:mm', userTimezone)} - {formatSystemTimeInUserTimezone(currentEndTime, 'HH:mm', userTimezone)}
                </div>
                {showDifferentTimezone && (
                  <div className="text-xs text-gray-500 pl-6">
                    {userTimezoneDisplay}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-2 text-green-600">Lịch học mới</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(selectedSlot.start, 'EEEE, dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatSystemTimeInUserTimezone(selectedSlot.start, 'HH:mm', userTimezone)} - {formatSystemTimeInUserTimezone(selectedSlot.end, 'HH:mm', userTimezone)}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Date & Time Selection */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h1 className="text-3xl font-bold mb-2">Đổi lịch học</h1>
              <p className="text-gray-600 mb-8">Chọn ngày và giờ mới cho lịch học của bạn</p>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Chọn ngày</h3>
                  <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Chọn giờ</h3>
                    {showDifferentTimezone && (
                      <div className="flex items-center text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                        <span>{userTimezoneDisplay}</span>
                      </div>
                    )}
                  </div>

                  {slots.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                      Không có lịch trống cho ngày này
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
                              onClick={() => setSelectedSlot(slot)}
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
                            <span className="font-medium">📍 Lưu ý:</span> Thời gian hiển thị theo múi giờ của bạn ({userTimezoneDisplay}).
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {selectedSlot && (
                  <div className="pt-6 border-t">
                    <Button
                      onClick={handleReschedule}
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? 'Đang xử lý...' : 'Xác nhận đổi lịch'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
