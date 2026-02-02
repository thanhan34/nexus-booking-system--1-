import React from 'react';
import { Globe } from 'lucide-react';
import { Select } from '../ui/Common';
import { getTimezoneOptionLabel } from '../../utils/timezone';

interface BookingTimezoneSelectProps {
  value: string;
  timezones: string[];
  onChange: (timezone: string) => void;
}

export const BookingTimezoneSelect = ({ value, timezones, onChange }: BookingTimezoneSelectProps) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-semibold text-slate-700">Chọn múi giờ</label>
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4" style={{ color: '#fc5d01' }} />
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 text-sm"
        style={{ borderColor: '#fdbc94' }}
      >
        {timezones.map((timezone) => (
          <option key={timezone} value={timezone}>
            {getTimezoneOptionLabel(timezone)}
          </option>
        ))}
      </Select>
    </div>
  </div>
);