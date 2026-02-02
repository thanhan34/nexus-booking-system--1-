import React from 'react';
import { addDays, format, startOfToday } from 'date-fns';
import { Calendar, Filter } from 'lucide-react';
import { Button, Select } from '../ui/Common';
import { User } from '../../types';

interface MasterScheduleHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  trainerFilter: string;
  onTrainerFilterChange: (value: string) => void;
  trainers: User[];
}

export const MasterScheduleHeader = ({
  selectedDate,
  onDateChange,
  trainerFilter,
  onTrainerFilterChange,
  trainers
}: MasterScheduleHeaderProps) => (
  <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4" style={{ backgroundColor: '#fedac2' }}>
    <div className="flex items-center gap-4">
      <Calendar className="w-5 h-5" style={{ color: '#fc5d01' }} />
      <h3 className="font-bold whitespace-nowrap" style={{ color: '#fc5d01' }}>Week of {format(selectedDate, 'MMM d, yyyy')}</h3>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" style={{ color: '#fd7f33' }} />
        <Select
          value={trainerFilter}
          onChange={e => onTrainerFilterChange(e.target.value)}
          className="h-8 py-1 w-40 text-xs"
          style={{ borderColor: '#fdbc94' }}
        >
          <option value="all">All Trainers</option>
          {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDateChange(addDays(selectedDate, -7))}
        style={{ borderColor: '#fdbc94', color: '#fc5d01' }}
      >
        Prev Week
      </Button>
      <Button
        size="sm"
        onClick={() => onDateChange(startOfToday())}
        style={{ backgroundColor: '#fc5d01' }}
      >
        Today
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDateChange(addDays(selectedDate, 7))}
        style={{ borderColor: '#fdbc94', color: '#fc5d01' }}
      >
        Next Week
      </Button>
    </div>
  </div>
);