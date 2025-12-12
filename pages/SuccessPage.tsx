import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button } from '../components/ui/Common';
import { CheckCircle, Calendar, Home } from 'lucide-react';
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

      <Link to="/">
        <Button variant="outline">
          <Home className="w-4 h-4 mr-2" />
          Return Home
        </Button>
      </Link>
    </div>
  );
};