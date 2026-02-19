'use client';

/**
 * Admin Manage Users page
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Loading, Alert } from '@/components/ui';
import { getAllUsers, updateUserRole } from '@/lib/api/admin';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

type RoleFilter = 'all' | 'admin' | 'judge' | 'founder';

function ManageUsersContent() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch all users
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAllUsers,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      setShowConfirmDialog(false);
      setSelectedRole('');
    },
    onError: (error: any) => {
      console.error('Failed to update user role:', error);
      alert(error.response?.data?.detail || 'Failed to update user role');
    },
  });

  // Filter users by search query and role
  const filteredUsers = users?.filter((user: User) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'judge':
        return 'bg-blue-100 text-blue-700';
      case 'founder':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Get user initials
  const getInitials = (username: string) => {
    return username?.slice(0, 2).toUpperCase() || 'U';
  };

  // Handle edit role button click
  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  // Handle role update
  const handleUpdateRole = () => {
    if (!editingUser || !selectedRole) return;

    // Show confirmation if changing to/from admin role
    if (editingUser.role === 'admin' || selectedRole === 'admin') {
      setShowConfirmDialog(true);
    } else {
      updateRoleMutation.mutate({
        userId: editingUser.id,
        role: selectedRole,
      });
    }
  };

  // Confirm role change
  const confirmRoleChange = () => {
    if (!editingUser || !selectedRole) return;

    updateRoleMutation.mutate({
      userId: editingUser.id,
      role: selectedRole,
    });
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingUser(null);
    setSelectedRole('');
    setShowConfirmDialog(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error">
            {error instanceof Error
              ? error.message
              : 'Failed to load users'}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Manage Users</h1>
          <p className="mt-2 text-lg text-gray-600">
            View and manage user roles
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                roleFilter === 'all'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                roleFilter === 'admin'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setRoleFilter('judge')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                roleFilter === 'judge'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Judges
            </button>
            <button
              onClick={() => setRoleFilter('founder')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                roleFilter === 'founder'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Founders
            </button>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          {filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user: User) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.username}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(user.username)
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleEditRole(user)}
                          variant="primary"
                          className="text-sm py-1 px-3"
                        >
                          Edit Role
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                {searchQuery || roleFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No users available in the system'}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Role Modal */}
      {editingUser && !showConfirmDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Edit User Role
              </h2>
              <button
                onClick={cancelEdit}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User Info */}
            <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center">
                <div className="h-14 w-14 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden mr-4 flex-shrink-0">
                  {editingUser.avatar_url ? (
                    <img
                      src={editingUser.avatar_url}
                      alt={editingUser.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(editingUser.username)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-slate-900 truncate">
                    {editingUser.username}
                  </p>
                  <p className="text-sm text-slate-600 truncate">{editingUser.email}</p>
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Select New Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 font-medium transition-all"
              >
                <option value="founder">Founder</option>
                <option value="judge">Judge</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                disabled={updateRoleMutation.isPending}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={
                  updateRoleMutation.isPending ||
                  selectedRole === editingUser.role
                }
                className="flex-1 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mx-auto">
              <svg
                className="h-8 w-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">
              Confirm Role Change
            </h2>

            <p className="text-sm text-slate-600 mb-8 text-center leading-relaxed">
              {editingUser.role === 'admin'
                ? `You are about to remove admin privileges from ${editingUser.username}. This action should be performed carefully.`
                : `You are about to grant admin privileges to ${editingUser.username}. This will give them full access to the system.`}
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                disabled={updateRoleMutation.isPending}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                disabled={updateRoleMutation.isPending}
                className="flex-1 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {updateRoleMutation.isPending ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageUsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ManageUsersContent />
    </ProtectedRoute>
  );
}
