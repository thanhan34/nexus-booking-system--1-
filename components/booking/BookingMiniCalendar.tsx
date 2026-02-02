import React from 'react';
import { format, addDays, startOfToday } from 'date-fns';

interface BookingMiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const BookingMiniCalendar = ({ selectedDate, onSelectDate }: BookingMiniCalendarProps) => {
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