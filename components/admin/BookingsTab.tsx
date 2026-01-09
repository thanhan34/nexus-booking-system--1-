import React, { useState } from 'react';
import { useDataStore } from '../../store';
import { Card, Badge, Button, Select, Input } from '../ui/Common';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { Search, Calendar, User, Clock, FilterX } from 'lucide-react';
import toast from 'react-hot-toast';

export const BookingsTab = () => {
  const { bookings, trainers, eventTypes, updateBookingStatus } = useDataStore();
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookings = bookings.filter(b => {
    if (trainerFilter !== 'all' && b.trainerId !== trainerFilter) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchTerm) {
       const term = searchTerm.toLowerCase();
       if (!b.studentName.toLowerCase().includes(term) && 
           !b.studentEmail.toLowerCase().includes(term) &&
           !b.id.toLowerCase().includes(term)) return false;
    }
    const bookingTime = parseISO(b.startTime);
    const now = new Date();
    if (timeFilter === 'upcoming' && isBefore(bookingTime, now)) return false;
    if (timeFilter === 'past' && isAfter(bookingTime, now)) return false;
    return true;
  });

  const sortedBookings = filteredBookings.sort((a, b) => {
     const timeA = new Date(a.startTime).getTime();
     const timeB = new Date(b.startTime).getTime();
     // If 'upcoming', we want closest first (ASC).
     if (timeFilter === 'upcoming') return timeA - timeB;
     // For 'past' or 'all', we usually want recent/future first (DESC).
     return timeB - timeA;
  });

  const handleStatusChange = async (bookingId: string, newStatus: 'confirmed' | 'cancelled') => {
      if (window.confirm(`Are you sure you want to change status to ${newStatus}?`)) {
          await updateBookingStatus(bookingId, newStatus);
          toast.success("Booking status updated");
      }
  };

  const clearFilters = () => {
    setTrainerFilter('all');
    setStatusFilter('all');
    setTimeFilter('all');
    setSearchTerm('');
    toast.success("Filters cleared");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-end xl:items-center bg-white p-4 rounded-lg border shadow-sm">
         <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-1">
            <div className="w-full md:w-48">
               <label className="text-xs font-semibold text-slate-500 mb-1 block">Trainer</label>
               <Select value={trainerFilter} onChange={e => setTrainerFilter(e.target.value)}>
                  <option value="all">All Trainers</option>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </Select>
            </div>
            <div className="w-full md:w-40">
               <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
               <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
               </Select>
            </div>
             <div className="w-full md:w-40">
               <label className="text-xs font-semibold text-slate-500 mb-1 block">Time</label>
               <Select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                  <option value="all">All Time</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
               </Select>
            </div>
            <div className="w-full md:w-64 relative">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Search</label>
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                      placeholder="Student, email or ID..." 
                      className="pl-9"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
           </div>
         </div>
         
         <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-9 px-3 flex items-center justify-center bg-slate-50">
              {filteredBookings.length} results
            </Badge>
            <Button variant="outline" onClick={clearFilters} title="Clear Filters" className="px-3">
               <FilterX className="w-4 h-4" />
            </Button>
         </div>
      </div>

      <div className="space-y-4">
         {sortedBookings.length === 0 ? (
             <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                 No bookings match your filters.
                 <div className="mt-2">
                   <Button variant="ghost" onClick={clearFilters} className="text-accent">Clear all filters</Button>
                 </div>
             </div>
         ) : (
             sortedBookings.map(booking => {
                 const trainer = trainers.find(t => t.id === booking.trainerId);
                 const eventType = eventTypes.find(e => e.id === booking.eventTypeId);
                 const isPast = isBefore(parseISO(booking.startTime), new Date());
                 
                 return (
                     <Card key={booking.id} className={`p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-colors ${isPast ? 'bg-slate-50/50' : 'bg-white'}`}>
                         <div className="flex-1 space-y-1">
                             <div className="flex items-center gap-2">
                                 <Badge className={booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                     {booking.status}
                                 </Badge>
                                 <span className="text-xs text-slate-400 font-mono">#{booking.id.slice(-6)}</span>
                                 {booking.isRecurring && <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-100">Recurring</Badge>}
                                 {isPast && <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">Past</Badge>}
                             </div>
                             <h4 className="font-bold text-lg">{booking.studentName}</h4>
                             <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                                 <span className="flex items-center gap-1 min-w-[150px]">
                                    <User className="w-3.5 h-3.5 text-slate-400" /> 
                                    <span className="font-medium text-slate-700">{trainer?.name || 'Unknown'}</span>
                                 </span>
                                 <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" /> 
                                    {eventType?.name || 'Unknown Session'}
                                 </span>
                                 <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> 
                                    {format(parseISO(booking.startTime), 'EEE, MMM d, yyyy')} • {format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}
                                 </span>
                             </div>
                             {booking.note && <div className="text-sm text-slate-500 italic mt-1 bg-slate-50 p-2 rounded inline-block">"{booking.note}"</div>}
                         </div>
                         <div className="flex gap-2">
                             {booking.status === 'confirmed' && !isPast && (
                                 <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleStatusChange(booking.id, 'cancelled')}>
                                     Cancel
                                 </Button>
                             )}
                         </div>
                     </Card>
                 );
             })
         )}
      </div>
    </div>
  );
};