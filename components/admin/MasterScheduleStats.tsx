import React from 'react';
import { User, Booking, BlockedSlot, ExternalBooking } from '../../types';
import { Card } from '../ui/Common';
import { Calendar, Clock, User as UserIcon, AlertCircle } from 'lucide-react';

interface MasterScheduleStatsProps {
  trainers: User[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
}

export const MasterScheduleStats = ({
  trainers,
  bookings,
  blockedSlots,
  externalBookings
}: MasterScheduleStatsProps) => {
  const totalBookings = bookings.filter(b => b.status === 'confirmed').length;
  const totalBlockedDays = blockedSlots.length;
  const totalExternalBookings = externalBookings.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#fc5d01' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Trainers</p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#fc5d01' }}>{trainers.length}</p>
            </div>
            <UserIcon className="w-10 h-10 text-slate-300" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Confirmed Bookings</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{totalBookings}</p>
            </div>
            <Calendar className="w-10 h-10 text-slate-300" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Blocked Days</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{totalBlockedDays}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-slate-300" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">External Events</p>
              <p className="text-3xl font-bold text-slate-600 mt-1">{totalExternalBookings}</p>
            </div>
            <Clock className="w-10 h-10 text-slate-300" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 text-slate-700">Schedule Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dbeafe' }}></div>
            <span>Internal Booking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 rounded"></div>
            <span>External Event (Google Cal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 rounded border-2 border-red-200"></div>
            <span>Blocked Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 rounded border border-blue-300"></div>
            <span>Today</span>
          </div>
        </div>
      </Card>
    </div>
  );
};