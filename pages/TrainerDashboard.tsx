
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore, useDataStore } from '../store';
import { Card, Button, Input, Badge, Dialog } from '../components/ui/Common';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday 
} from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Link as LinkIcon, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  LayoutGrid,
  Ban,
  Search,
  History,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { AvailabilitySlot, Booking, BlockedSlot, ExternalBooking } from '../types';
import toast from 'react-hot-toast';
import AvailabilityForm from '../components/AvailabilityForm';
import { BlockedDaysManager } from '../components/BlockedDaysManager';
import { getGoogleAuthUrl, deleteTrainerCredentials, testCalendarConnection } from '../services/calendar';
import { getFirestore, doc, updateDoc as firestoreUpdateDoc } from 'firebase/firestore';
import app from '../services/firebase';

export const TrainerDashboard = () => {
  const { user } = useAuthStore();
  const { bookings, blockedSlots, externalBookings, fetchData, updateBookingStatus, updateUserAvailability, updateUserProfile } = useDataStore();
  const [activeTab, setActiveTab] = useState<'bookings' | 'schedule' | 'blocked' | 'students' | 'settings'>('bookings');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user) return null;

  const myBookings = bookings
    .filter(b => b.trainerId === user.id)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
  const myBlockedSlots = blockedSlots.filter(b => b.trainerId === user.id);
  const myExternalBookings = externalBookings.filter(b => b.trainerId === user.id);

  // Group bookings by date for list view
  const groupedBookings = myBookings.reduce((acc, booking) => {
    const dateKey = format(parseISO(booking.startTime), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  const copyBookingLink = () => {
    // Tạo slug từ tên trainer: loại bỏ khoảng trắng và chuyển thành lowercase
    const trainerName = user.name || user.email.split('@')[0];
    const nameSlug = trainerName.toLowerCase().replace(/\s+/g, '-');
    const identifier = user.slug || nameSlug;
    const url = `${window.location.origin}${window.location.pathname}#/trainer/${identifier}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied to clipboard");
  };

  const handleGoogleSync = async () => {
    if (user.googleCalendarConnected) {
      // Disconnect
      try {
        // Delete tokens from Firestore
        await deleteTrainerCredentials(user.id);
        
        // Update user profile
        await updateUserProfile(user.id, { 
          googleCalendarConnected: false, 
          googleCalendarEmail: undefined,
          googleRefreshToken: undefined,
          calendarDisconnectedReason: undefined,
          calendarDisconnectedAt: undefined,
        });
        
        toast.success("Disconnected from Google Calendar");
      } catch (error) {
        console.error('Error disconnecting:', error);
        toast.error("Failed to disconnect Google Calendar");
      }
    } else {
      // Connect - redirect to Google OAuth
      try {
        console.log('🔐 Starting Google Calendar OAuth flow...');
        const authUrl = getGoogleAuthUrl();
        console.log('🔗 Redirecting to:', authUrl);
        
        // Redirect to Google OAuth consent screen
        // User will be redirected back to /oauth/callback after authorization
        window.location.href = authUrl;
      } catch (error: any) {
        console.error('Error starting OAuth:', error);
        toast.error(error.message || "Failed to start Google Calendar authorization");
      }
    }
  };

  const handleReconnectCalendar = () => {
    // Same as connect
    handleGoogleSync();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
          <p className="text-slate-500">Manage your sessions and availability</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-lg border overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'bookings' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            My Bookings
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'schedule' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            Availability
          </button>
          <button 
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'blocked' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            Blocked Days
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'students' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            Students
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'bookings' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Upcoming Sessions</h3>
            <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-sm transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-sm transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                title="Calendar View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-6">
              {Object.entries(groupedBookings).map(([date, dayBookings]) => (
                <div key={date}>
                  <h3 className="font-semibold text-lg text-slate-500 mb-3 sticky top-20 bg-slate-50 py-2 z-10">
                    {format(parseISO(date), 'EEEE, MMMM do')}
                  </h3>
                  <div className="space-y-3">
                    {(dayBookings as Booking[]).map(booking => (
                      <Card key={booking.id} className="p-4 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center border-l-4 border-l-slate-900">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-slate-400">#{booking.id.slice(-4)}</span>
                            <Badge className={booking.status === 'confirmed' ? 'bg-green-600' : 'bg-red-500'}>
                              {booking.status}
                            </Badge>
                            {booking.isRecurring && (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                Recurring
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-bold text-lg">{booking.studentName}</h4>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-2">
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-1"/> {format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}</span>
                            <span className="flex items-center"><User className="w-4 h-4 mr-1"/> {booking.studentEmail}</span>
                            {booking.studentPhone && <span className="flex items-center"><Phone className="w-4 h-4 mr-1"/> {booking.studentPhone}</span>}
                          </div>
                          {booking.note && <div className="mt-2 text-sm bg-slate-100 p-2 rounded">Note: {booking.note}</div>}
                        </div>
                        {booking.status === 'confirmed' && (
                          <div className="flex gap-2">
                            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              {myBookings.length === 0 && (
                <div className="text-center py-12 text-slate-500">No bookings found.</div>
              )}
            </div>
          ) : (
            <TrainerCalendar bookings={myBookings} blockedSlots={myBlockedSlots} externalBookings={myExternalBookings} />
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <AvailabilityForm availability={user.availability} />
      )}
      
      {activeTab === 'blocked' && (
        <BlockedDaysManager />
      )}
      
      {activeTab === 'students' && (
        <StudentsView bookings={bookings} />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Zoom Meeting Link Card */}
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-1">Zoom Meeting Link</h3>
              <p className="text-xs text-slate-500">Students will receive this link in booking emails and calendar events</p>
            </div>
            
            <ZoomLinkEditor userId={user.id} currentLink={user.zoomMeetingLink || ''} />
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">💡 Tip:</span> Use a Personal Meeting ID (PMI) for consistency, or create a dedicated meeting room for your coaching sessions.
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Personal Booking Page</h3>
            <p className="text-sm text-slate-600">Share this link with students to let them book sessions specifically with you.</p>
            
            {/* Editable Slug Section */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Custom Link Slug</label>
                <p className="text-xs text-slate-500 mb-2">Customize your booking page URL. Use only lowercase letters, numbers, and hyphens.</p>
                <SlugEditor userId={user.id} currentSlug={user.slug || (user.name || user.email.split('@')[0]).toLowerCase().replace(/\s+/g, '-')} />
              </div>
              
              <div className="pt-2 border-t">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Your Booking Link</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={`${window.location.origin}${window.location.pathname}#/trainer/${user.slug || (user.name || user.email.split('@')[0]).toLowerCase().replace(/\s+/g, '-')}`} 
                    className="bg-slate-50 font-mono text-xs" 
                  />
                  <Button onClick={copyBookingLink} variant="outline" title="Copy link">
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg mb-1">Google Calendar Integration</h3>
                <p className="text-xs text-slate-500">Automatically create calendar events and send invitations</p>
              </div>
              <Badge className={user.googleCalendarConnected ? "bg-green-100 text-green-700 border-green-200 flex items-center gap-1" : "bg-slate-100 text-slate-600 flex items-center gap-1"}>
                {user.googleCalendarConnected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    Not Connected
                  </>
                )}
              </Badge>
            </div>
            
            {user.googleCalendarConnected ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-1">
                        Connected to {user.googleCalendarEmail}
                      </p>
                      <p className="text-xs text-green-700">
                        New bookings will automatically create calendar events and send email invitations to students.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-blue-900 mb-2">How it works:</h4>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>Calendar events are created on your Google Calendar</li>
                    <li>Students receive email invitations automatically</li>
                    <li>Reminders sent 1 day and 1 hour before sessions</li>
                    <li>Students can accept/decline invitations</li>
                  </ul>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                  onClick={handleGoogleSync}
                >
                  Disconnect Google Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-700 mb-3">
                    Connect your Google Calendar to:
                  </p>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">✓</span>
                      <span>Automatically create calendar events for new bookings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">✓</span>
                      <span>Send email invitations to students</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">✓</span>
                      <span>Set automatic reminders for both you and students</span>
                    </li>
                  </ul>
                </div>
                
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={handleGoogleSync}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </Button>
                
                <p className="text-xs text-slate-500 text-center">
                  You'll be asked to authorize access to your Google Calendar
                </p>
              </div>
            )}
          </Card>
          </div>
        </div>
      )}
    </div>
  );
};

const TrainerCalendar = ({ bookings, blockedSlots, externalBookings }: { bookings: Booking[], blockedSlots: BlockedSlot[], externalBookings: ExternalBooking[] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const resetToday = () => setCurrentMonth(new Date());

  return (
    <Card className="p-0 overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-slate-500" />
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={resetToday} className="h-8">Today</Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 border-b bg-slate-50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="p-3 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px border-b">
        {days.map(day => {
          const dayBookings = bookings.filter(b => isSameDay(parseISO(b.startTime), day) && b.status !== 'cancelled');
          const dayExternal = externalBookings.filter(ex => isSameDay(new Date(ex.start), day));
          const isBlocked = blockedSlots.some(b => b.date === format(day, 'yyyy-MM-dd'));
          
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);

          return (
            <div 
              key={day.toISOString()} 
              className={`min-h-[120px] bg-white p-2 flex flex-col gap-1 transition-colors ${
                !isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : ''
              } ${isBlocked ? 'bg-stripes-red' : ''}`}
            >
              <div className={`text-right text-sm mb-1 font-medium flex justify-between items-center ${isTodayDate ? 'text-blue-600' : 'text-slate-700'}`}>
                {isBlocked && <span className="text-xs bg-red-100 text-red-600 px-1 rounded font-bold">BLOCKED</span>}
                <span className={isBlocked ? '' : 'ml-auto'}>
                  {isTodayDate && <span className="bg-blue-100 text-blue-700 px-1.5 rounded text-xs mr-1">Today</span>}
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                {dayBookings.map(b => (
                  <div 
                    key={b.id} 
                    className="text-xs p-1.5 rounded border bg-blue-50 border-blue-100 text-blue-900 group relative hover:shadow-sm cursor-default"
                  >
                    <div className="font-semibold">{format(parseISO(b.startTime), 'HH:mm')}</div>
                    <div className="truncate">{b.studentName}</div>
                    
                    {/* Tooltip */}
                    <div className="hidden group-hover:block absolute left-0 bottom-full mb-1 z-20 w-48 p-2 bg-slate-900 text-white text-xs rounded shadow-lg pointer-events-none">
                      <p className="font-bold border-b border-slate-700 pb-1 mb-1">{b.studentName}</p>
                      <p>{format(parseISO(b.startTime), 'HH:mm')} - {format(parseISO(b.endTime), 'HH:mm')}</p>
                      <p className="text-slate-300">{b.studentEmail}</p>
                      {b.note && <p className="italic mt-1 text-slate-400">"{b.note}"</p>}
                    </div>
                  </div>
                ))}
                
                {dayExternal.map(ex => (
                  <div 
                    key={ex.id} 
                    className="text-xs p-1.5 rounded border bg-slate-100 border-slate-200 text-slate-600 cursor-default flex items-center gap-1 opacity-80"
                  >
                    <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                    <div className="truncate">{format(new Date(ex.start), 'HH:mm')} GCal</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const ScheduleEditor = ({ user, onSave }: { user: any, onSave: any }) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const [schedule, setSchedule] = useState<AvailabilitySlot[]>(user.availability || []);

  const handleToggleDay = (day: string) => {
    const exists = schedule.find(s => s.day === day);
    if (exists) {
      setSchedule(schedule.map(s => s.day === day ? { ...s, active: !s.active } : s));
    } else {
      setSchedule([...schedule, { day, start: '09:00', end: '17:00', active: true }]);
    }
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setSchedule(schedule.map(s => s.day === day ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    onSave(user.id, schedule);
    toast.success("Availability updated successfully");
  };

  return (
    <Card className="p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Weekly Schedule</h2>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
      <div className="space-y-4">
        {days.map(day => {
          const slot = schedule.find(s => s.day === day) || { day, start: '09:00', end: '17:00', active: false };
          return (
            <div key={day} className="flex items-center gap-4 py-2 border-b last:border-0">
              <div className="w-32 capitalize font-medium flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={slot.active} 
                  onChange={() => handleToggleDay(day)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                {day}
              </div>
              <div className={`flex items-center gap-2 transition-opacity ${slot.active ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <Input 
                  type="time" 
                  value={slot.start} 
                  onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                  className="w-32"
                />
                <span className="text-slate-400">to</span>
                <Input 
                  type="time" 
                  value={slot.end} 
                  onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const ZoomLinkEditor = ({ userId, currentLink }: { userId: string, currentLink: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [zoomLink, setZoomLink] = useState(currentLink);
  const [isSaving, setIsSaving] = useState(false);
  const { updateUserProfile } = useDataStore();

  const validateZoomLink = (link: string): boolean => {
    if (!link) return true; // Empty is valid (can be removed)
    
    // Extract URL from text if it's a full Zoom invitation block
    const urlMatch = link.match(/https?:\/\/[^\s]+/);
    const urlToValidate = urlMatch ? urlMatch[0] : link;
    
    // Check if it's a valid URL and contains zoom
    try {
      const url = new URL(urlToValidate);
      // Accept zoom.us, zoom.com, and regional subdomains (us06web.zoom.us, etc.)
      return url.hostname.endsWith('zoom.us') || 
             url.hostname.endsWith('zoom.com') || 
             url.hostname.includes('.zoom.us') ||
             url.hostname.includes('.zoom.com');
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    // Keep the full text as entered
    const linkToSave = zoomLink.trim();
    
    // Validate that it contains a valid Zoom URL
    if (linkToSave && !validateZoomLink(linkToSave)) {
      toast.error("Please enter a valid Zoom meeting link");
      return;
    }

    if (linkToSave === currentLink) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(userId, { zoomMeetingLink: linkToSave || undefined });
      toast.success("Zoom meeting link updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update Zoom link");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setZoomLink(currentLink);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          value={zoomLink}
          onChange={(e) => setZoomLink(e.target.value)}
          placeholder="Paste your full Zoom invitation here..."
          className="w-full rounded-md border border-slate-300 p-2 text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
          rows={4}
          disabled={isSaving}
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {currentLink ? (
        <div className="space-y-2">
          <textarea
            value={currentLink}
            readOnly
            className="w-full bg-slate-50 font-mono text-sm rounded-md border border-slate-200 p-2 resize-none"
            rows={4}
          />
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            Edit
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-slate-500 mb-2">No Zoom link set</p>
          <Button onClick={() => setIsEditing(true)} size="sm">
            Add Zoom Link
          </Button>
        </div>
      )}
    </div>
  );
};

const SlugEditor = ({ userId, currentSlug }: { userId: string, currentSlug: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [slug, setSlug] = useState(currentSlug);
  const [isSaving, setIsSaving] = useState(false);
  const { updateUserProfile } = useDataStore();

  const validateSlug = (value: string): boolean => {
    // Only lowercase letters, numbers, and hyphens
    return /^[a-z0-9-]+$/.test(value);
  };

  const handleSave = async () => {
    if (!slug || slug === currentSlug) {
      setIsEditing(false);
      return;
    }

    if (!validateSlug(slug)) {
      toast.error("Slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(userId, { slug });
      toast.success("Booking link updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update slug");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSlug(currentSlug);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="your-custom-slug"
          className="font-mono text-sm"
          disabled={isSaving}
        />
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        value={currentSlug}
        readOnly
        className="bg-slate-50 font-mono text-sm"
      />
      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
        Edit
      </Button>
    </div>
  );
};

const StudentsView = ({ bookings }: { bookings: Booking[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string | null>(null);

  // Group bookings by student email
  const students = useMemo(() => {
    const studentMap = new Map();
    bookings.forEach(b => {
      if (!studentMap.has(b.studentEmail)) {
        studentMap.set(b.studentEmail, {
          email: b.studentEmail,
          name: b.studentName,
          phone: b.studentPhone,
          bookings: []
        });
      }
      studentMap.get(b.studentEmail).bookings.push(b);
    });
    return Array.from(studentMap.values());
  }, [bookings]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = selectedStudentEmail ? students.find(s => s.email === selectedStudentEmail) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Student History</h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search students..." 
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="grid grid-cols-4 p-4 border-b bg-slate-50 font-medium text-sm text-slate-500">
           <div>Student Name</div>
           <div>Email</div>
           <div>Total Sessions</div>
           <div className="text-right">Actions</div>
        </div>
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No students found.</div>
        ) : (
          <div className="divide-y">
            {filteredStudents.map(student => (
              <div key={student.email} className="grid grid-cols-4 p-4 items-center hover:bg-slate-50 transition-colors">
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-slate-600">{student.email}</div>
                <div className="text-sm">
                  <Badge variant="outline" className="bg-slate-100">
                    {student.bookings.length} Bookings
                  </Badge>
                </div>
                <div className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelectedStudentEmail(student.email)}>
                    <History className="w-4 h-4 mr-2" />
                    View History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student History Dialog */}
      <Dialog 
        open={!!selectedStudent} 
        onClose={() => setSelectedStudentEmail(null)} 
        title={`History: ${selectedStudent?.name}`}
      >
        <div className="space-y-4">
           <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded">
              <div><span className="font-bold">Email:</span> {selectedStudent?.email}</div>
              <div><span className="font-bold">Phone:</span> {selectedStudent?.phone}</div>
           </div>
           
           <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
             {selectedStudent?.bookings
               .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
               .map(booking => (
               <div key={booking.id} className="border rounded-lg p-3 text-sm hover:border-slate-400 transition-colors">
                 <div className="flex justify-between items-start mb-1">
                   <div className="font-bold">{format(parseISO(booking.startTime), 'MMM d, yyyy')}</div>
                   <Badge className={booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                     {booking.status}
                   </Badge>
                 </div>
                 <div className="flex justify-between text-slate-600">
                   <span>{format(parseISO(booking.startTime), 'HH:mm')} - {format(parseISO(booking.endTime), 'HH:mm')}</span>
                   {booking.isRecurring && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">Recurring</span>}
                 </div>
                 {booking.note && <div className="mt-2 text-xs italic text-slate-500 bg-slate-50 p-2 rounded">"{booking.note}"</div>}
               </div>
             ))}
           </div>
        </div>
      </Dialog>
    </div>
  );
};
