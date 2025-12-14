import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button } from '../components/ui/Common';
import { CheckCircle, Calendar, Home, FileText } from 'lucide-react';
import { useDataStore } from '../store';
import { format } from 'date-fns';

export const SuccessPage = () => {
  const { bookingId } = useParams();
  const { bookings, eventTypes } = useDataStore();
  
  const booking = bookings.find(b => b.id === bookingId);
  
  if (!booking) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-xl">Booking not found or loading...</h2>
        <Link to="/" className="text-blue-600 underline mt-4 block">Return Home</Link>
      </div>
    );
  }

  const eventType = eventTypes.find(e => e.id === booking.eventTypeId);

  return (
    <div className="max-w-md mx-auto mt-12 text-center">
      <div className="mb-6 flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
      <p className="text-slate-600 mb-8">We've sent a confirmation email to {booking.studentEmail}</p>

      <Card className="p-6 text-left mb-8 shadow-md">
        <h3 className="font-semibold text-lg border-b pb-2 mb-4">{eventType?.name}</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <Calendar className="w-5 h-5 mr-3 text-slate-500 mt-0.5" />
            <div>
              <p className="font-medium">{format(new Date(booking.startTime), 'EEEE, MMMM do, yyyy')}</p>
              <p className="text-slate-600">{format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}</p>
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
            Booking Reference: <span className="font-mono text-slate-900">{booking.id}</span>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/my-bookings">
          <Button style={{ backgroundColor: '#fc5d01' }} className="w-full sm:w-auto">
            <FileText className="w-4 h-4 mr-2" />
            Quản lý / Hủy lịch học
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" className="w-full sm:w-auto">
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </Link>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <p className="font-medium mb-1">📧 Email xác nhận đã được gửi</p>
        <p className="text-blue-700">
          Vui lòng kiểm tra email <strong>{booking.studentEmail}</strong> để xem chi tiết và link tham gia lớp học.
        </p>
        <p className="text-blue-700 mt-2">
          💡 Để hủy lịch học, vui lòng truy cập trang "Quản lý / Hủy lịch học" ở trên.
        </p>
      </div>
    </div>
  );
};
