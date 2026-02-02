import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User as UserIcon } from 'lucide-react';
import { Card } from '../ui/Common';
import { EventType, GeneratedTimeSlot, User } from '../../types';
import { formatSystemTimeInUserTimezone } from '../../utils/timezone';

interface BookingEventSummaryProps {
  eventType: EventType;
  requestedTrainer?: User | null;
  selectedSlot?: GeneratedTimeSlot | null;
  userTimezone: string;
  userTimezoneDisplay: string;
  showDifferentTimezone: boolean;
}

export const BookingEventSummary = ({
  eventType,
  requestedTrainer,
  selectedSlot,
  userTimezone,
  userTimezoneDisplay,
  showDifferentTimezone
}: BookingEventSummaryProps) => (
  <Card className="p-6 sticky top-24 bg-slate-50 border-none shadow-none">
    <h2 className="text-xl font-bold mb-4">{eventType.name}</h2>

    {requestedTrainer && (
      <div className="mb-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {requestedTrainer.photoUrl ? (
              <img
                src={requestedTrainer.photoUrl}
                alt={requestedTrainer.name || 'Teacher'}
                className="w-16 h-16 rounded-full object-cover border-2 border-accent shadow-md"
                onError={(e) => {
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
);