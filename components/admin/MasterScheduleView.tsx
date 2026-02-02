import React, { useState } from 'react';
import { User, Booking, BlockedSlot, ExternalBooking } from '../../types';
import { Button, Card, Badge } from '../ui/Common';
import { format, parseISO } from 'date-fns';
import { Clock, User as UserIcon, Phone, Mail, AlertCircle } from 'lucide-react';
import { MasterScheduleStats } from './MasterScheduleStats';
import { MasterScheduleHeader } from './MasterScheduleHeader';
import { MasterScheduleGrid } from './MasterScheduleGrid';

interface MasterScheduleViewProps {
  trainers: User[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
}

export const MasterScheduleView = ({ trainers, bookings, blockedSlots, externalBookings }: MasterScheduleViewProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <MasterScheduleStats
        trainers={trainers}
        bookings={bookings}
        blockedSlots={blockedSlots}
        externalBookings={externalBookings}
      />

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <MasterScheduleHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          trainerFilter={trainerFilter}
          onTrainerFilterChange={setTrainerFilter}
          trainers={trainers}
        />
        <MasterScheduleGrid
          selectedDate={selectedDate}
          trainers={trainers}
          trainerFilter={trainerFilter}
          bookings={bookings}
          blockedSlots={blockedSlots}
          externalBookings={externalBookings}
          onBookingSelect={setSelectedBooking}
        />
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <Card 
            className="max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#fc5d01' }}>Booking Details</h3>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 mt-0.5" style={{ color: '#fc5d01' }} />
                <div>
                  <div className="text-sm text-slate-600">Date & Time</div>
                  <div className="font-semibold">
                    {format(parseISO(selectedBooking.startTime), 'EEEE, MMM d, yyyy')}
                  </div>
                  <div className="text-sm text-slate-600">
                    {format(parseISO(selectedBooking.startTime), 'HH:mm')} - {format(parseISO(selectedBooking.endTime), 'HH:mm')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="w-5 h-5 mt-0.5" style={{ color: '#fc5d01' }} />
                <div>
                  <div className="text-sm text-slate-600">Student</div>
                  <div className="font-semibold">{selectedBooking.studentName}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-0.5" style={{ color: '#fc5d01' }} />
                <div>
                  <div className="text-sm text-slate-600">Email</div>
                  <div className="font-medium text-sm">{selectedBooking.studentEmail}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 mt-0.5" style={{ color: '#fc5d01' }} />
                <div>
                  <div className="text-sm text-slate-600">Phone</div>
                  <div className="font-medium">{selectedBooking.studentPhone}</div>
                </div>
              </div>

              {selectedBooking.note && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#fc5d01' }} />
                  <div>
                    <div className="text-sm text-slate-600">Note</div>
                    <div className="text-sm">{selectedBooking.note}</div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  <Badge 
                    className="font-semibold"
                    style={{ 
                      backgroundColor: selectedBooking.status === 'confirmed' ? '#22c55e' : '#94a3b8',
                      color: '#ffffff'
                    }}
                  >
                    {selectedBooking.status.toUpperCase()}
                  </Badge>
                </div>
                {selectedBooking.isRecurring && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-600">Type</span>
                    <Badge 
                      className="font-semibold"
                      style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}
                    >
                      RECURRING
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={() => setSelectedBooking(null)}
              className="w-full mt-6"
              style={{ backgroundColor: '#fc5d01' }}
            >
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};
