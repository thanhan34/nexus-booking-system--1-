import React, { useState } from 'react';
import { useDataStore } from '../store';
import { Card, Badge, Button, Input } from '../components/ui/Common';
import { format, parseISO, isAfter } from 'date-fns';
import { Search, Calendar, User, Clock, Mail, AlertCircle, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { SimpleLayout } from '../components/ui/SimpleLayout';

export const StudentBookingsPage = () => {
  const { bookings, trainers, eventTypes, updateBookingStatus, fetchData } = useDataStore();
  const [emailInput, setEmailInput] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Fetch data when component mounts
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailInput.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      toast.error('Email không hợp lệ');
      return;
    }

    setIsSearching(true);
    
    // Simulate loading for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSearchedEmail(emailInput.trim().toLowerCase());
    setIsSearching(false);
  };

  const handleCancelBooking = async (bookingId: string, bookingInfo: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy lịch học này?\n\n${bookingInfo}\n\nLưu ý: Sau khi hủy, bạn sẽ nhận email xác nhận.`)) {
      return;
    }

    setCancellingId(bookingId);
    
    try {
      await updateBookingStatus(bookingId, 'cancelled');
      toast.success('Đã hủy lịch học thành công! Email xác nhận đã được gửi.');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Không thể hủy lịch học. Vui lòng thử lại.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReset = () => {
    setSearchedEmail('');
    setEmailInput('');
  };

  // Filter bookings by searched email
  const userBookings = searchedEmail 
    ? bookings.filter(b => b.studentEmail.toLowerCase() === searchedEmail)
    : [];

  // Separate upcoming and past bookings
  const now = new Date();
  const upcomingBookings = userBookings.filter(b => 
    isAfter(parseISO(b.startTime), now) && b.status === 'confirmed'
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pastBookings = userBookings.filter(b => 
    !isAfter(parseISO(b.startTime), now) || b.status === 'cancelled'
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <SimpleLayout>
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="/images/white_logo-removebg-preview.png" 
            alt="PTE Intensive Logo" 
            className="h-48 w-auto object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#fc5d01' }}>
            Tra cứu & Quản lý lịch học
          </h1>
          <p className="text-slate-600">
            Nhập email để xem danh sách lịch học và thực hiện hủy lịch nếu cần
          </p>
        </div>

        {!searchedEmail ? (
          // STATE 1: Email Input Form
          <Card className="p-8 shadow-lg">
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email của bạn
                </label>
                <Input 
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="example@email.com"
                  className="text-lg py-3"
                  disabled={isSearching}
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  Nhập email bạn đã sử dụng khi đặt lịch học
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full py-3 text-base font-semibold"
                style={{ backgroundColor: '#fc5d01' }}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Tra cứu lịch học
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#fc5d01' }} />
                <div>
                  <p className="font-medium mb-1">Lưu ý về bảo mật:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Chỉ nhập email chính xác của bạn</li>
                    <li>Hệ thống không lưu trữ thông tin tra cứu</li>
                    <li>Mỗi lần tra cứu cần nhập lại email để đảm bảo an toàn</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          // STATE 2: Display Results
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with searched email */}
            <Card className="p-6 shadow-lg" style={{ borderTop: '4px solid #fc5d01' }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Lịch học của bạn</h2>
                  <p className="text-slate-600 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {searchedEmail}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Tra cứu email khác
                </Button>
              </div>
            </Card>

            {userBookings.length === 0 ? (
              // No bookings found
              <Card className="p-12 text-center shadow-lg">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold mb-2 text-slate-700">
                  Không tìm thấy lịch học
                </h3>
                <p className="text-slate-600 mb-6">
                  Không có lịch học nào được đặt với email <strong>{searchedEmail}</strong>
                </p>
                <Button onClick={handleReset} variant="outline">
                  Thử email khác
                </Button>
              </Card>
            ) : (
              <>
                {/* Upcoming Bookings */}
                {upcomingBookings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" style={{ color: '#fc5d01' }} />
                      Lịch học sắp tới ({upcomingBookings.length})
                    </h3>
                    <div className="space-y-4">
                      {upcomingBookings.map(booking => {
                        const trainer = trainers.find(t => t.id === booking.trainerId);
                        const eventType = eventTypes.find(e => e.id === booking.eventTypeId);
                        const isCancelling = cancellingId === booking.id;

                        return (
                          <Card 
                            key={booking.id} 
                            className="p-6 shadow-md hover:shadow-lg transition-shadow"
                          >
                            <div className="flex flex-col lg:flex-row gap-6 justify-between">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-green-100 text-green-700 font-semibold">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Đã xác nhận
                                  </Badge>
                                  <span className="text-xs text-slate-400 font-mono">
                                    #{booking.id.slice(-8)}
                                  </span>
                                </div>

                                <h4 className="font-bold text-xl" style={{ color: '#fc5d01' }}>
                                  {eventType?.name || 'Buổi học'}
                                </h4>

                                <div className="space-y-2 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">
                                      {format(parseISO(booking.startTime), 'EEEE, dd/MM/yyyy')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>
                                      {format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-400" />
                                    <span>Giảng viên: <strong>{trainer?.name || 'Unknown'}</strong></span>
                                  </div>
                                </div>

                                {booking.note && (
                                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic">
                                    <strong>Ghi chú:</strong> {booking.note}
                                  </div>
                                )}
                              </div>

                              <div className="flex lg:flex-col gap-3 lg:justify-center">
                                <Button 
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex-1 lg:flex-none"
                                  onClick={() => handleCancelBooking(
                                    booking.id,
                                    `${eventType?.name}\n${format(parseISO(booking.startTime), 'dd/MM/yyyy HH:mm')}`
                                  )}
                                  disabled={isCancelling}
                                >
                                  {isCancelling ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent mr-2"></div>
                                      Đang hủy...
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-4 h-4 mr-2" />
                                      Hủy lịch
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Past/Cancelled Bookings */}
                {pastBookings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-600">
                      <Clock className="w-5 h-5" />
                      Lịch sử ({pastBookings.length})
                    </h3>
                    <div className="space-y-4">
                      {pastBookings.map(booking => {
                        const trainer = trainers.find(t => t.id === booking.trainerId);
                        const eventType = eventTypes.find(e => e.id === booking.eventTypeId);

                        return (
                          <Card 
                            key={booking.id} 
                            className="p-6 bg-slate-50 shadow-sm"
                          >
                            <div className="flex flex-col lg:flex-row gap-4 justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={
                                    booking.status === 'cancelled' 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-slate-200 text-slate-700'
                                  }>
                                    {booking.status === 'cancelled' ? 'Đã hủy' : 'Đã hoàn thành'}
                                  </Badge>
                                  <span className="text-xs text-slate-400 font-mono">
                                    #{booking.id.slice(-8)}
                                  </span>
                                </div>

                                <h4 className="font-semibold text-lg text-slate-700">
                                  {eventType?.name || 'Buổi học'}
                                </h4>

                                <div className="space-y-1 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{format(parseISO(booking.startTime), 'dd/MM/yyyy')}</span>
                                    <Clock className="w-3.5 h-3.5 text-slate-400 ml-2" />
                                    <span>
                                      {format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{trainer?.name || 'Unknown'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </SimpleLayout>
  );
};
