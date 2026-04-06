import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, BookOpen, Calendar, GraduationCap, RefreshCw, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, useDataStore } from '../store';
import { auth, fetchUsers } from '../services/firebase';
import { Button, Card, Select } from '../components/ui/Common';
import { AdminScheduleTabs } from '../components/admin/AdminScheduleTabs';
import { BookingsTab } from '../components/admin/BookingsTab';
import { ExamCandidatesTab } from '../components/admin/ExamCandidatesTab';
import { RecurringBookingManager } from '../components/admin/RecurringBookingManager';
import { BlockedDaysManager } from '../components/BlockedDaysManager';

const SupportDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'blocked' | 'recurring' | 'bookings' | 'exams'>('schedule');
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { trainers, bookings, blockedSlots, externalBookings, eventTypes, fetchData } = useDataStore();
  const supportAdmin = trainers.find(trainer => trainer.email === 'dtan42@gmail.com');

  useEffect(() => {
    if (!selectedTrainerId && trainers.length > 0) {
      setSelectedTrainerId(trainers[0].id);
    }
  }, [trainers, selectedTrainerId]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async authUser => {
      if (!authUser) {
        navigate('/login');
        return;
      }

      const userList = await fetchUsers();
      const user = userList.find((u: any) => u.id === authUser.uid);
      const isSupport = user?.role?.toLowerCase() === 'support';

      if (!isSupport) {
        navigate('/');
      } else {
        fetchData();
      }
    });

    return () => unsubscribe();
  }, [navigate, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-12">
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6" style={{ color: '#fc5d01' }} />
                <h1 className="text-3xl font-bold" style={{ color: '#fc5d01' }}>Support Dashboard</h1>
              </div>
              <p className="text-slate-600 mt-2 inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 shadow-sm">Welcome back, {currentUser?.name || currentUser?.email}</p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
              style={{ backgroundColor: '#fc5d01' }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'text-white shadow-md'
                : 'text-slate-600 bg-white hover:bg-slate-50'
            }`}
            style={activeTab === 'schedule' ? { backgroundColor: '#fc5d01' } : {}}
          >
            <Calendar className="w-4 h-4" />
            Trainer Schedules
          </button>

          <button
            onClick={() => setActiveTab('blocked')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'blocked'
                ? 'text-white shadow-md'
                : 'text-slate-600 bg-white hover:bg-slate-50'
            }`}
            style={activeTab === 'blocked' ? { backgroundColor: '#fc5d01' } : {}}
          >
            <Ban className="w-4 h-4" />
            Blocked Days
          </button>

          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'text-white shadow-md'
                : 'text-slate-600 bg-white hover:bg-slate-50'
            }`}
            style={activeTab === 'recurring' ? { backgroundColor: '#fc5d01' } : {}}
          >
            <Repeat className="w-4 h-4" />
            Recurring Bookings
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'text-white shadow-md'
                : 'text-slate-600 bg-white hover:bg-slate-50'
            }`}
            style={activeTab === 'bookings' ? { backgroundColor: '#fc5d01' } : {}}
          >
            <BookOpen className="w-4 h-4" />
            All Bookings
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'exams'
                ? 'text-white shadow-md'
                : 'text-slate-600 bg-white hover:bg-slate-50'
            }`}
            style={activeTab === 'exams' ? { backgroundColor: '#fc5d01' } : {}}
          >
            <GraduationCap className="w-4 h-4" />
            Exam Schedule
          </button>
        </div>

        {activeTab === 'schedule' && (
          <AdminScheduleTabs
            trainers={trainers}
            bookings={bookings}
            blockedSlots={blockedSlots}
            externalBookings={externalBookings}
            eventTypes={eventTypes}
            adminId={supportAdmin?.id}
            isSupportOnly
          />
        )}

        {activeTab === 'blocked' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Blocked Days</h2>
                  <p className="text-slate-600 mt-1">Chọn trainer để support có thể quản lý ngày nghỉ thay cho trainer.</p>
                </div>

                <div className="w-full md:w-80">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Trainer</label>
                  <Select
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                  >
                    {trainers.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name || trainer.email}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {selectedTrainerId && <BlockedDaysManager managedTrainerId={selectedTrainerId} />}
          </div>
        )}

        {activeTab === 'recurring' && (
          <div className="animate-in fade-in duration-500">
            <RecurringBookingManager />
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">All Bookings</h2>
            <BookingsTab />
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="animate-in fade-in duration-500">
            <ExamCandidatesTab />
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportDashboard;