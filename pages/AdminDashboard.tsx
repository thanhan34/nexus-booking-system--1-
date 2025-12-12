import React, { useState, useEffect } from 'react';
import { fetchUsers, updateUserRole, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useDataStore, useAuthStore } from '../store';
import { MasterScheduleView } from '../components/admin/MasterScheduleView';
import { BookingsTab } from '../components/admin/BookingsTab';
import { StudentsView } from '../components/admin/StudentsView';
import { EventTypesTab } from '../components/admin/EventTypesTab';
import { RecurringBookingManager } from '../components/admin/RecurringBookingManager';
import { Card, Badge, Button, Select } from '../components/ui/Common';
import { Users, Calendar, BookOpen, Shield, Mail, RefreshCw, Layers, Trash2, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { trainers, bookings, blockedSlots, externalBookings, fetchData } = useDataStore();

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
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
              <Badge 
                className="px-4 py-2 text-base"
                style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}
              >
                {users.length} Users
              </Badge>
            </div>

            <Card className="overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: '#fedac2' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#fc5d01' }}>User Name</th>
                      <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#fc5d01' }}>Email</th>
                      <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#fc5d01' }}>Current Role</th>
                      <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#fc5d01' }}>Booking Slug</th>
                      <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#fc5d01' }}>Change Role</th>
                      <th className="px-6 py-4 text-center text-sm font-bold" style={{ color: '#fc5d01' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                          No users found. Create users to manage their roles.
                        </td>
                      </tr>
                    ) : (
                      users.map((user: any) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <input 
                                type="text"
                                value={user.name || ''}
                                onChange={(e) => {
                                  setUsers(users.map((u: any) => u.id === user.id ? {...u, name: e.target.value} : u));
                                }}
                                onBlur={(e) => {
                                  const originalUser = users.find((u: any) => u.id === user.id);
                                  if (e.target.value && e.target.value !== (originalUser as any)?.name) {
                                    handleUserInfoUpdate(user.id, 'name', e.target.value);
                                  }
                                }}
                                placeholder="Enter name..."
                                className="px-3 py-1.5 border rounded-lg w-48 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-1"
                                style={{ borderColor: user.name ? '#e2e8f0' : '#fc5d01', focusRing: '#fc5d01' }}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <input 
                                type="email"
                                value={user.email || ''}
                                onChange={(e) => {
                                  setUsers(users.map((u: any) => u.id === user.id ? {...u, email: e.target.value} : u));
                                }}
                                onBlur={(e) => {
                                  const originalUser = users.find((u: any) => u.id === user.id);
                                  if (e.target.value && e.target.value !== (originalUser as any)?.email) {
                                    handleUserInfoUpdate(user.id, 'email', e.target.value);
                                  }
                                }}
                                placeholder="Enter email..."
                                className="px-3 py-1.5 border rounded-lg w-56 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-1"
                                style={{ borderColor: user.email ? '#e2e8f0' : '#fc5d01', focusRing: '#fc5d01' }}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              className={`font-semibold ${
                                user.role?.toLowerCase() === 'admin' 
                                  ? 'text-white' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                              style={user.role?.toLowerCase() === 'admin' ? { backgroundColor: '#fc5d01' } : {}}
                            >
                              {user.role || 'User'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="text"
                              value={user.slug || ''}
                              onChange={(e) => {
                                const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                                setUsers(users.map((u: any) => u.id === user.id ? {...u, slug: newSlug} : u));
                              }}
                              onBlur={(e) => {
                                if (e.target.value !== user.slug) {
                                  handleSlugUpdate(user.id, e.target.value, user.name || user.email);
                                }
                              }}
                              placeholder="e.g., pte-intensive"
                              className="px-3 py-2 border rounded-lg w-48 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                              style={{ borderColor: '#fdbc94', focusRing: '#fc5d01' }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <Select 
                              value={user.role || 'user'}
                              onChange={(e) => handleRoleChange(user.id, e.target.value, user.email)}
                              className="w-40"
                              style={{ borderColor: '#fdbc94' }}
                            >
                              <option value="admin">Admin</option>
                              <option value="trainer">Trainer</option>
                              <option value="user">User</option>
                            </Select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name, user.email)}
                                disabled={user.id === currentUser?.id}
                                className={`p-2 rounded-lg transition-all ${
                                  user.id === currentUser?.id
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                }`}
                                title={user.id === currentUser?.id ? 'Cannot delete your own account' : 'Delete user'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Trainer Schedules</h2>
            <MasterScheduleView 
              trainers={trainers}
              bookings={bookings}
              blockedSlots={blockedSlots}
              externalBookings={externalBookings}
            />
          </div>
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
