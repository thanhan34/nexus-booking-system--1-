import React, { useState } from 'react';
import { User, Booking, BlockedSlot, ExternalBooking } from '../../types';
import { Button, Select, Card, Badge } from '../ui/Common';
import { addDays, format, isSameDay, parseISO, startOfToday } from 'date-fns';
import { Filter, Calendar, Clock, User as UserIcon, Phone, Mail, AlertCircle } from 'lucide-react';

interface MasterScheduleViewProps {
  trainers: User[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  externalBookings: ExternalBooking[];
}

export const MasterScheduleView = ({ trainers, bookings, blockedSlots, externalBookings }: MasterScheduleViewProps) => {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));

  const visibleTrainers = trainerFilter === 'all' 
    ? trainers 
    : trainers.filter(t => t.id === trainerFilter);

  // Calculate statistics
  const totalBookings = bookings.filter(b => b.status === 'confirmed').length;
  const totalBlockedDays = blockedSlots.length;
  const totalExternalBookings = externalBookings.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Statistics Cards */}
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

      {/* Legend */}
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

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4" style={{ backgroundColor: '#fedac2' }}>
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5" style={{ color: '#fc5d01' }} />
            <h3 className="font-bold whitespace-nowrap" style={{ color: '#fc5d01' }}>Week of {format(selectedDate, 'MMM d, yyyy')}</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: '#fd7f33' }} />
              <Select 
                value={trainerFilter} 
                onChange={e => setTrainerFilter(e.target.value)}
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
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              style={{ borderColor: '#fdbc94', color: '#fc5d01' }}
            >
              Prev Week
            </Button>
            <Button 
              size="sm" 
              onClick={() => setSelectedDate(startOfToday())}
              style={{ backgroundColor: '#fc5d01' }}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              style={{ borderColor: '#fdbc94', color: '#fc5d01' }}
            >
              Next Week
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
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
            {visibleTrainers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No trainers found.</p>
              </div>
            ) : (
              visibleTrainers.map(trainer => {
                // Count total bookings for this trainer
                const trainerBookingsCount = bookings.filter(b => 
                  b.trainerId === trainer.id && b.status === 'confirmed'
                ).length;

                return (
                  <div key={trainer.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-0 hover:bg-slate-50/30 transition-colors">
                    <div className="p-3 border-r">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-sm" style={{ color: '#fc5d01' }}>
                          {trainer.name}
                        </div>
                        <div className="text-xs text-slate-500">{trainer.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            className="text-xs px-2 py-0.5"
                            style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}
                          >
                            {trainerBookingsCount} bookings
                          </Badge>
                          {trainer.googleCalendarConnected && (
                            <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
                              GCal
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {next7Days.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const isBlocked = blockedSlots.some(b => b.trainerId === trainer.id && b.date === dateKey);
                      const dayBookings = bookings.filter(b => 
                        b.trainerId === trainer.id && 
                        isSameDay(parseISO(b.startTime), day) && 
                        b.status === 'confirmed'
                      );
                      const dayExternal = externalBookings.filter(ex => 
                        ex.trainerId === trainer.id && 
                        isSameDay(new Date(ex.start), day)
                      );
                      
                      const totalEvents = dayBookings.length + dayExternal.length;
                      
                      return (
                        <div 
                          key={day.toString()} 
                          className={`p-2 border-r min-h-[100px] text-xs relative ${
                            isBlocked ? 'bg-red-50/50' : ''
                          } ${isSameDay(day, new Date()) ? 'bg-blue-50/30' : ''}`}
                        >
                          {isBlocked && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <span 
                                className="px-2 py-1 rounded text-xs font-bold transform -rotate-12 shadow-sm"
                                style={{ backgroundColor: '#fc5d01', color: '#ffffff' }}
                              >
                                BLOCKED
                              </span>
                            </div>
                          )}
                          
                          {/* Event count badge */}
                          {totalEvents > 0 && !isBlocked && (
                            <div className="absolute top-1 right-1 z-10">
                              <Badge 
                                className="text-xs px-1.5 py-0.5 font-bold"
                                style={{ backgroundColor: '#fc5d01', color: '#ffffff' }}
                              >
                                {totalEvents}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="space-y-1 relative z-10">
                            {dayBookings.map(b => (
                              <div 
                                key={b.id} 
                                className="bg-blue-100 text-blue-800 p-1.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
                                onClick={() => setSelectedBooking(b)}
                                title={`Click for details\n${format(parseISO(b.startTime), 'HH:mm')} - ${format(parseISO(b.endTime), 'HH:mm')}\n${b.studentName}\n${b.studentEmail}`}
                              >
                                <div className="font-semibold">{format(parseISO(b.startTime), 'HH:mm')}</div>
                                <div className="truncate text-[10px]">{b.studentName}</div>
                              </div>
                            ))}
                            {dayExternal.map(ex => (
                              <div 
                                key={ex.id} 
                                className="bg-slate-200 text-slate-700 p-1.5 rounded border border-slate-300 italic"
                                title={`External Event\n${format(new Date(ex.start), 'HH:mm')}`}
                              >
                                <div className="font-semibold text-[10px]">GCal</div>
                                <div className="truncate text-[10px]">{format(new Date(ex.start), 'HH:mm')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
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
