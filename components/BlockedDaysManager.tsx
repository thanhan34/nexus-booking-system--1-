import React, { useState } from 'react';
import { useAuthStore, useDataStore } from '../store';
import { Card, Button, Input, Badge } from './ui/Common';
import { Calendar, Ban, Trash2, Plus } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export const BlockedDaysManager = () => {
  const { user } = useAuthStore();
  const { blockedSlots, addBlockedSlot, removeBlockedSlot, fetchData } = useDataStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  if (!user) return null;

  const myBlockedSlots = blockedSlots.filter(b => b.trainerId === user.id);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  const handleToggleBlock = async (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const isBlocked = myBlockedSlots.some(b => b.date === dateKey);

    try {
      if (isBlocked) {
        await removeBlockedSlot(user.id, dateKey);
        toast.success(`Đã bỏ chặn ngày ${format(date, 'dd/MM/yyyy')}`);
      } else {
        await addBlockedSlot({ trainerId: user.id, date: dateKey });
        toast.success(`Đã chặn ngày ${format(date, 'dd/MM/yyyy')}`);
      }
      await fetchData();
    } catch (error) {
      console.error('Error toggling blocked slot:', error);
      toast.error('Lỗi khi cập nhật ngày chặn');
    }
  };

  const nextMonth = () => setCurrentMonth(addDays(currentMonth, 30));
  const prevMonth = () => setCurrentMonth(addDays(currentMonth, -30));
  const resetToday = () => setCurrentMonth(new Date());

  return (
    <Card className="p-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#fc5d01' }}>
          <Ban className="w-6 h-6" />
          Quản lý ngày nghỉ / Blocked Days
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Chọn các ngày bạn không muốn nhận booking. Những ngày này sẽ không hiển thị cho học viên khi đặt lịch.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600 font-medium mb-1">Tổng ngày đã chặn</div>
          <div className="text-3xl font-bold text-red-700">{myBlockedSlots.length}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium mb-1">Ngày này tháng</div>
          <div className="text-3xl font-bold text-blue-700">
            {myBlockedSlots.filter(b => {
              const date = parseISO(b.date);
              return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
            }).length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium mb-1">Hướng dẫn</div>
          <div className="text-xs text-green-700 mt-1">Click vào ngày để chặn/bỏ chặn</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={prevMonth} className="h-8">
              ← Tháng trước
            </Button>
            <Button variant="outline" size="sm" onClick={resetToday} className="h-8">
              Hôm nay
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth} className="h-8">
              Tháng sau →
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 border-b" style={{ backgroundColor: '#fedac2' }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="p-3 uppercase tracking-wider" style={{ color: '#fc5d01' }}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-slate-200 gap-px">
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const isBlocked = myBlockedSlots.some(b => b.date === dateKey);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isPast && handleToggleBlock(day)}
                disabled={isPast}
                className={`min-h-[100px] bg-white p-2 flex flex-col gap-1 transition-all hover:shadow-md ${
                  !isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : ''
                } ${isTodayDate ? 'bg-blue-50 border-2 border-blue-300' : ''} ${
                  isBlocked ? 'bg-red-50 border-2 border-red-400' : ''
                } ${isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`text-right text-sm font-medium ${isTodayDate ? 'text-blue-600' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                </div>
                
                {isBlocked && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <Ban className="w-8 h-8 text-red-500" />
                      <span className="text-xs font-bold text-red-600">BLOCKED</span>
                    </div>
                  </div>
                )}
                
                {!isBlocked && !isPast && isCurrentMonth && (
                  <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Plus className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Blocked Days List */}
      {myBlockedSlots.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Ban className="w-5 h-5" style={{ color: '#fc5d01' }} />
            Danh sách ngày đã chặn
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myBlockedSlots
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((slot) => {
                const date = parseISO(slot.date);
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                
                return (
                  <div
                    key={slot.date}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isPast ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Ban className={`w-4 h-4 ${isPast ? 'text-slate-400' : 'text-red-500'}`} />
                      <div>
                        <div className={`font-semibold ${isPast ? 'text-slate-600' : 'text-slate-900'}`}>
                          {format(date, 'dd/MM/yyyy')}
                        </div>
                        <div className={`text-xs ${isPast ? 'text-slate-400' : 'text-slate-500'}`}>
                          {format(date, 'EEEE')}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleBlock(date)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100 border-red-200 p-2"
                      title="Bỏ chặn ngày này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </Card>
  );
};
