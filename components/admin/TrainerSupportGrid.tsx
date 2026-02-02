import React from 'react';
import { format, isSameDay } from 'date-fns';
import { Phone, Mail } from 'lucide-react';
import { Badge, Card } from '../ui/Common';
import { SupportSlot } from './TrainerSupportTypes';
import { User } from '../../types';

interface TrainerSupportGridProps {
  next7Days: Date[];
  trainers: User[];
  slotsByTrainer: Record<string, Record<string, SupportSlot[]>>;
  onSlotSelect: (slot: SupportSlot) => void;
}

export const TrainerSupportGrid = ({
  next7Days,
  trainers,
  slotsByTrainer,
  onSlotSelect
}: TrainerSupportGridProps) => (
  <Card className="overflow-hidden">
    <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b" style={{ backgroundColor: '#fedac2' }}>
      <div className="p-3 font-semibold border-r" style={{ color: '#fc5d01' }}>Trainer</div>
      {next7Days.map(day => (
        <div
          key={day.toString()}
          className={`p-3 text-center border-r font-medium ${
            isSameDay(day, new Date())
              ? 'bg-blue-50 text-blue-700 border-2 border-blue-300'
              : ''
          }`}
        >
          <div className="font-bold">{format(day, 'EEE')}</div>
          <div className="text-xs text-slate-500">{format(day, 'MMM d')}</div>
        </div>
      ))}
    </div>
    {trainers.length === 0 ? (
      <div className="p-8 text-center text-slate-500">No trainers available.</div>
    ) : (
      trainers.map(trainer => (
        <div key={trainer.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-0">
          <div className="p-3 border-r">
            <div className="font-medium text-sm" style={{ color: '#fc5d01' }}>{trainer.name}</div>
            <div className="text-xs text-slate-500">{trainer.email}</div>
            <div className="flex gap-2 mt-2">
              <Badge className="text-[10px] px-2 py-0.5" style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}>
                Support
              </Badge>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Phone className="w-3 h-3" />
                <span>Call</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Mail className="w-3 h-3" />
                <span>Email</span>
              </div>
            </div>
          </div>
          {next7Days.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const slots = slotsByTrainer[trainer.id]?.[dayKey] || [];
            return (
              <div key={dayKey} className="p-2 border-r min-h-[100px] text-xs">
                {slots.length === 0 ? (
                  <div className="text-slate-400 italic">No overlap</div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {slots.map(slot => (
                      <button
                        key={`${trainer.id}-${dayKey}-${slot.timeLabel}`}
                        className="px-2 py-1 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: '#ffac7b', color: '#ffffff' }}
                        onClick={() => onSlotSelect(slot)}
                      >
                        {slot.timeLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))
    )}
  </Card>
);