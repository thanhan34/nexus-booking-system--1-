import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../store';
import { Card, Button } from '../components/ui/Common';
import { Calendar, Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { formatSystemTimeInUserTimezone, getUserTimezone, getTimezoneDisplayName, SYSTEM_TIMEZONE } from '../utils/timezone';

export const CancelBookingPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { bookings, eventTypes, trainers, fetchData, updateBookingStatus } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [userTimezone] = useState(getUserTimezone());
  const userTimezoneDisplay = getTimezoneDisplayName(userTimezone);
  const systemTimezoneDisplay = getTimezoneDisplayName(SYSTEM_TIMEZONE);

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

  const handleCancel = async () => {
    if (!booking || !bookingId) return;

    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch học này?')) {
      return;
    }

    setLoading(true);
    try {
      await updateBookingStatus(bookingId, 'cancelled');
      setCancelled(true);
      toast.success('Đã hủy lịch học thành công!');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Không thể hủy lịch học. Vui lòng thử lại.');
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

  if (booking.status === 'cancelled' || cancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Đã hủy thành công</h2>
          <p className="text-gray-600 mb-6">
            Lịch học của bạn đã được hủy. Email xác nhận đã được gửi.
          </p>
          <Button onClick={() => navigate('/')}>Về trang chủ</Button>
        </Card>
      </div>
    );
  }

  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/images/white_logo-removebg-preview.png" 
            alt="PTE Intensive Logo" 
            className="h-32 w-auto object-contain"
          />
        </div>

        <Card className="p-8">
          <div className="flex items-center justify-center mb-6">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-2">Hủy lịch học</h1>
          <p className="text-center text-gray-600 mb-8">
            Bạn có chắc chắn muốn hủy lịch học này không?
          </p>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-lg mb-4">Thông tin lịch học</h2>
            
            <div className="space-y-3">
              {eventType && (
                <div className="flex items-start">
                  <div className="w-6 h-6 mr-3 flex-shrink-0">
                    📚
                  </div>
                  <div>
                    <div className="font-medium">{eventType.name}</div>
                    <div className="text-sm text-gray-600">{eventType.durationMinutes} phút</div>
                  </div>
                </div>
              )}

              {trainer && (
                <div className="flex items-start">
                  <User className="w-6 h-6 mr-3 flex-shrink-0 text-gray-600" />
                  <div>
                    <div className="font-medium">Giảng viên</div>
                    <div className="text-sm text-gray-600">{trainer.name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <Calendar className="w-6 h-6 mr-3 flex-shrink-0 text-gray-600" />
                <div>
                  <div className="font-medium">Ngày học</div>
                  <div className="text-sm text-gray-600">
                    {format(startTime, 'EEEE, dd/MM/yyyy')}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="w-6 h-6 mr-3 flex-shrink-0 text-gray-600" />
                <div>
                  <div className="font-medium">Giờ học</div>
                  <div className="text-sm text-gray-600">
                    🇻🇳 Giờ Việt Nam: {formatSystemTimeInUserTimezone(startTime, 'HH:mm', SYSTEM_TIMEZONE)} - {formatSystemTimeInUserTimezone(endTime, 'HH:mm', SYSTEM_TIMEZONE)}
                  </div>
                  {userTimezone !== SYSTEM_TIMEZONE && (
                    <div className="text-sm text-gray-600 mt-1">
                      🌍 Giờ của bạn ({userTimezoneDisplay}): {formatSystemTimeInUserTimezone(startTime, 'HH:mm', userTimezone)} - {formatSystemTimeInUserTimezone(endTime, 'HH:mm', userTimezone)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-6 h-6 mr-3 flex-shrink-0">
                  👤
                </div>
                <div>
                  <div className="font-medium">Học viên</div>
                  <div className="text-sm text-gray-600">{booking.studentName}</div>
                  <div className="text-sm text-gray-600">{booking.studentEmail}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Lưu ý quan trọng:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sau khi hủy, lịch học sẽ không thể khôi phục</li>
                  <li>Email xác nhận hủy sẽ được gửi đến bạn và giảng viên</li>
                  <li>Nếu muốn đặt lại, bạn cần book lại từ đầu</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex-1"
              disabled={loading}
            >
              Quay lại
            </Button>
            <Button
              onClick={handleCancel}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
