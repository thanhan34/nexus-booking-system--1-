import React, { useState, useEffect } from 'react';
import { fetchUsers, updateUserRole, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useDataStore, useAuthStore } from '../store';
import { BookingsTab } from '../components/admin/BookingsTab';
import { StudentsView } from '../components/admin/StudentsView';
import { EventTypesTab } from '../components/admin/EventTypesTab';
import { RecurringBookingManager } from '../components/admin/RecurringBookingManager';
import { Button } from '../components/ui/Common';
import { Users, Calendar, BookOpen, Shield, RefreshCw, Layers, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminScheduleTabs } from '../components/admin/AdminScheduleTabs';
import { UserManagementTab } from '../components/admin/UserManagementTab';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { trainers, bookings, blockedSlots, externalBookings, eventTypes, fetchData } = useDataStore();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async authUser => {
      if (!authUser) {
        navigate('/login');
        return;
      }

      // Check user role (case-insensitive)
      const userList = await fetchUsers();
      const user = userList.find((u: any) => u.id === authUser.uid);
      const isAdmin = user?.role?.toLowerCase() === 'admin';

      if (!isAdmin) {
        navigate('/');
      } else {
        setUsers(userList);
        fetchData();
      }
    });

    return () => unsubscribe();
  }, [navigate, fetchData]);

  const handleRoleChange = async (userId: string, newRole: string, userEmail: string) => {
    try {
      await updateUserRole(userId, newRole, userEmail);
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
      toast.success(`Role updated to ${newRole} for ${userEmail}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleSlugUpdate = async (userId: string, newSlug: string, userName: string) => {
    try {
      const { updateUserSlug } = await import('../services/firebase');
      await updateUserSlug(userId, newSlug);
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
      await fetchData();
      toast.success(`Slug updated for ${userName}`);
    } catch (error) {
      toast.error('Failed to update slug');
    }
  };

  const handleUserInfoUpdate = async (userId: string, field: 'name' | 'email', value: string) => {
    try {
      const { updateUserInfo } = await import('../services/firebase');
      await updateUserInfo(userId, { [field]: value });
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    // Prevent deleting current user
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account!');
      return;
    }

    // Confirmation
    const confirmMessage = `Are you sure you want to delete user "${userName || userEmail}"? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const { deleteUser } = await import('../services/firebase');
      await deleteUser(userId);
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
      await fetchData();
      toast.success(`User ${userName || userEmail} deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete user');
      console.error('Delete error:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const userList = await fetchUsers();
      setUsers(userList);
      await fetchData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'events', label: 'Event Types', icon: Layers },
    { id: 'recurring', label: 'Recurring Bookings', icon: Repeat },
    { id: 'schedule', label: 'Trainer Schedules', icon: Calendar },
    { id: 'bookings', label: 'All Bookings', icon: BookOpen },
    { id: 'students', label: 'Student History', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-12">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#fc5d01' }}>Admin Dashboard</h1>
              <p className="text-slate-600 mt-1">Welcome back, {currentUser?.name || currentUser?.email}</p>
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

          {/* Tabs Navigation */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-white shadow-md'
                      : 'text-slate-600 bg-white hover:bg-slate-50'
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: '#fc5d01' } : {}}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'events' && (
          <EventTypesTab />
        )}

        {activeTab === 'recurring' && (
          <div className="animate-in fade-in duration-500">
            <RecurringBookingManager />
          </div>
        )}

        {activeTab === 'users' && (
          <UserManagementTab
            users={users}
            setUsers={setUsers}
            currentUserId={currentUser?.id}
            onRoleChange={handleRoleChange}
            onSlugUpdate={handleSlugUpdate}
            onUserInfoUpdate={handleUserInfoUpdate}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === 'schedule' && (
          <AdminScheduleTabs
            trainers={trainers}
            bookings={bookings}
            blockedSlots={blockedSlots}
            externalBookings={externalBookings}
            eventTypes={eventTypes}
            adminId={currentUser?.id}
          />
        )}

        {activeTab === 'bookings' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">All Bookings</h2>
            <BookingsTab />
          </div>
        )}

        {activeTab === 'students' && (
          <div className="animate-in fade-in duration-500">
            <StudentsView bookings={bookings} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
