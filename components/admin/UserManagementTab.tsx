import React from 'react';
import { Users, Mail, Trash2 } from 'lucide-react';
import { Badge, Card, Select } from '../ui/Common';

interface UserManagementTabProps {
  users: any[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  currentUserId?: string;
  onRoleChange: (userId: string, newRole: string, userEmail: string) => void;
  onSlugUpdate: (userId: string, newSlug: string, userName: string) => void;
  onUserInfoUpdate: (userId: string, field: 'name' | 'email', value: string) => void;
  onDeleteUser: (userId: string, userName: string, userEmail: string) => void;
}

export const UserManagementTab = ({
  users,
  setUsers,
  currentUserId,
  onRoleChange,
  onSlugUpdate,
  onUserInfoUpdate,
  onDeleteUser
}: UserManagementTabProps) => (
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
                          setUsers(users.map((u: any) => u.id === user.id ? { ...u, name: e.target.value } : u));
                        }}
                        onBlur={(e) => {
                          const originalUser = users.find((u: any) => u.id === user.id);
                          if (e.target.value && e.target.value !== (originalUser as any)?.name) {
                            onUserInfoUpdate(user.id, 'name', e.target.value);
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
                          setUsers(users.map((u: any) => u.id === user.id ? { ...u, email: e.target.value } : u));
                        }}
                        onBlur={(e) => {
                          const originalUser = users.find((u: any) => u.id === user.id);
                          if (e.target.value && e.target.value !== (originalUser as any)?.email) {
                            onUserInfoUpdate(user.id, 'email', e.target.value);
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
                          : user.role?.toLowerCase() === 'support'
                            ? 'text-white'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                      style={user.role?.toLowerCase() === 'admin'
                        ? { backgroundColor: '#fc5d01' }
                        : user.role?.toLowerCase() === 'support'
                          ? { backgroundColor: '#fd7f33' }
                          : {}
                      }
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
                        setUsers(users.map((u: any) => u.id === user.id ? { ...u, slug: newSlug } : u));
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== user.slug) {
                          onSlugUpdate(user.id, e.target.value, user.name || user.email);
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
                      onChange={(e) => onRoleChange(user.id, e.target.value, user.email)}
                      className="w-40"
                      style={{ borderColor: '#fdbc94' }}
                    >
                      <option value="admin">Admin</option>
                      <option value="trainer">Trainer</option>
                      <option value="support">Support</option>
                      <option value="user">User</option>
                    </Select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => onDeleteUser(user.id, user.name, user.email)}
                        disabled={user.id === currentUserId}
                        className={`p-2 rounded-lg transition-all ${
                          user.id === currentUserId
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                        }`}
                        title={user.id === currentUserId ? 'Cannot delete your own account' : 'Delete user'}
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
);