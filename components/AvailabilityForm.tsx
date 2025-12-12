import React, { useState, useCallback } from 'react';
import { AvailabilitySlot, TimeSlot } from '../types';
import { Card, Button, Input } from '../components/ui/Common';
import toast from 'react-hot-toast';
import { useAuthStore, useDataStore } from '../store';
import { Plus, Trash2 } from 'lucide-react';

interface AvailabilityFormProps {
  availability: AvailabilitySlot[] | undefined;
}

const AvailabilityForm: React.FC<AvailabilityFormProps> = ({ availability: initialAvailability }) => {
  const { user } = useAuthStore();
  const { updateUserAvailability } = useDataStore();
  
  // Migrate old format to new format if needed
  const migrateAvailability = (oldAvailability: any[]): AvailabilitySlot[] => {
    console.log('🔄 [MIGRATE] Initial availability:', oldAvailability);
    if (!oldAvailability || oldAvailability.length === 0) return [];
    
    const migrated = oldAvailability.map(slot => {
      // If already in new format
      if (slot.timeSlots && Array.isArray(slot.timeSlots)) {
        console.log('✅ [MIGRATE] Already in new format:', slot);
        return slot as AvailabilitySlot;
      }
      // Migrate from old format
      const newSlot = {
        day: slot.day,
        active: slot.active,
        timeSlots: slot.active && slot.start && slot.end 
          ? [{ start: slot.start, end: slot.end }] 
          : []
      } as AvailabilitySlot;
      console.log('🔄 [MIGRATE] Migrated from old format:', slot, '→', newSlot);
      return newSlot;
    });
    console.log('✅ [MIGRATE] Final migrated data:', migrated);
    return migrated;
  };

  const [schedule, setSchedule] = useState<AvailabilitySlot[]>(() => {
    const migrated = migrateAvailability(initialAvailability || []);
    console.log('🎬 [INITIAL STATE] Setting schedule to:', migrated);
    return migrated;
  });

  // Update schedule when initialAvailability changes
  React.useEffect(() => {
    if (initialAvailability) {
      const migrated = migrateAvailability(initialAvailability);
      console.log('🔄 [EFFECT] Updating schedule from prop change:', migrated);
      setSchedule(migrated);
    }
  }, [initialAvailability]);

  const handleToggleDay = (day: string) => {
    const exists = schedule.find(s => s.day === day);
    if (exists) {
      setSchedule(schedule.map(s => 
        s.day === day 
          ? { ...s, active: !s.active } 
          : s
      ));
    } else {
      setSchedule([...schedule, { 
        day, 
        active: true, 
        timeSlots: [{ start: '09:00', end: '17:00' }] 
      }]);
    }
  };

  const handleAddTimeSlot = (day: string) => {
    setSchedule(schedule.map(s => {
      if (s.day === day) {
        const lastSlot = s.timeSlots[s.timeSlots.length - 1];
        const newStart = lastSlot ? lastSlot.end : '09:00';
        const newEnd = lastSlot && lastSlot.end < '18:00' ? 
          String((parseInt(lastSlot.end.split(':')[0]) + 2)).padStart(2, '0') + ':00' : 
          '17:00';
        
        return {
          ...s,
          timeSlots: [...s.timeSlots, { start: newStart, end: newEnd }]
        };
      }
      return s;
    }));
  };

  const handleRemoveTimeSlot = (day: string, index: number) => {
    setSchedule(schedule.map(s => {
      if (s.day === day) {
        const newTimeSlots = s.timeSlots.filter((_, i) => i !== index);
        return {
          ...s,
          timeSlots: newTimeSlots
        };
      }
      return s;
    }));
  };

  const handleTimeChange = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setSchedule(schedule.map(s => {
      if (s.day === day) {
        const newTimeSlots = s.timeSlots.map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        );
        return { ...s, timeSlots: newTimeSlots };
      }
      return s;
    }));
  };

  const handleSave = useCallback(async () => {
    if (!user) return;
    
    // Validate time slots
    for (const day of schedule) {
      if (day.active) {
        for (const slot of day.timeSlots) {
          if (slot.start >= slot.end) {
            toast.error(`Lỗi: Thời gian kết thúc phải sau thời gian bắt đầu cho ${day.day}`);
            return;
          }
        }
      }
    }
    
    try {
      await updateUserAvailability(user.id, schedule);
      toast.success("Đã cập nhật lịch trống thành công!");
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error("Lỗi khi lưu lịch trống.");
    }
  }, [user, schedule, updateUserAvailability]);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames: Record<string, string> = {
    monday: 'Thứ Hai',
    tuesday: 'Thứ Ba',
    wednesday: 'Thứ Tư',
    thursday: 'Thứ Năm',
    friday: 'Thứ Sáu',
    saturday: 'Thứ Bảy',
    sunday: 'Chủ Nhật'
  };

  return (
    <Card className="p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Lịch trống trong tuần</h2>
          <p className="text-sm text-slate-500 mt-1">Thêm nhiều khung giờ cho mỗi ngày (ví dụ: 7am-11am, 1pm-5pm, 7pm-11pm)</p>
        </div>
        <Button onClick={handleSave} className="bg-[#fc5d01] hover:bg-[#fd7f33] text-white">
          Lưu thay đổi
        </Button>
      </div>
      
      <div className="space-y-6">
        {days.map(day => {
          const slot = schedule.find(s => s.day === day) || { 
            day, 
            active: false, 
            timeSlots: [] 
          };
          
          return (
            <div key={day} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <input 
                  type="checkbox" 
                  checked={slot.active} 
                  onChange={() => handleToggleDay(day)}
                  className="w-5 h-5 rounded border-slate-300 text-[#fc5d01] focus:ring-[#fc5d01]"
                />
                <span className="font-bold text-lg capitalize text-slate-800">
                  {dayNames[day]}
                </span>
              </div>
              
              <div className={`space-y-3 transition-opacity ${slot.active ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {slot.timeSlots.length === 0 && slot.active ? (
                  <div className="text-sm text-slate-500 italic py-2">
                    Chưa có khung giờ nào. Nhấn "Thêm khung giờ" để bắt đầu.
                  </div>
                ) : (
                  slot.timeSlots.map((timeSlot, index) => (
                    <div key={index} className="flex items-center gap-2 py-2">
                      <span className="text-sm font-medium text-slate-600 min-w-[70px]">
                        Khung {index + 1}:
                      </span>
                      <Input 
                        type="time" 
                        value={timeSlot.start} 
                        onChange={(e) => handleTimeChange(day, index, 'start', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-slate-400 font-medium px-1">đến</span>
                      <Input 
                        type="time" 
                        value={timeSlot.end} 
                        onChange={(e) => handleTimeChange(day, index, 'end', e.target.value)}
                        className="w-32"
                      />
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveTimeSlot(day, index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
                
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTimeSlot(day)}
                  className="w-full border-dashed border-2 border-[#fc5d01] text-[#fc5d01] hover:bg-[#fedac2]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm khung giờ
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default AvailabilityForm;
