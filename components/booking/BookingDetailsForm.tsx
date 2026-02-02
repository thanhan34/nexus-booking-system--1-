import React from 'react';
import { Button, Input } from '../ui/Common';

interface BookingDetailsFormProps {
  formData: {
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    studentCode: string;
    note: string;
  };
  errors: Record<string, string>;
  isSubmitting: boolean;
  onChange: (field: string, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const BookingDetailsForm = ({
  formData,
  errors,
  isSubmitting,
  onChange,
  onSubmit
}: BookingDetailsFormProps) => (
  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
    <h3 className="text-lg font-semibold mb-6">Enter Details</h3>
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Full Name *</label>
        <Input
          value={formData.studentName}
          onChange={event => onChange('studentName', event.target.value)}
          placeholder="John Smith"
        />
        {errors.studentName && <span className="text-xs text-red-500">{errors.studentName}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <Input
            type="email"
            value={formData.studentEmail}
            onChange={event => onChange('studentEmail', event.target.value)}
            placeholder="john@example.com"
          />
          {errors.studentEmail && <span className="text-xs text-red-500">{errors.studentEmail}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <Input
            value={formData.studentPhone}
            onChange={event => onChange('studentPhone', event.target.value)}
            placeholder="+1 234 567 890"
          />
          {errors.studentPhone && <span className="text-xs text-red-500">{errors.studentPhone}</span>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Student Code (Optional)</label>
        <Input
          value={formData.studentCode}
          onChange={event => onChange('studentCode', event.target.value)}
          placeholder="ST-12345"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Note (Optional)</label>
        <textarea
          className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
          rows={3}
          value={formData.note}
          onChange={event => onChange('note', event.target.value)}
        />
      </div>

      <div className="pt-4">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Booking...' : 'Confirm Booking'}
        </Button>
      </div>
    </form>
  </div>
);