'use client';

/**
 * Edit Profile Page
 * Allows users to edit their profile information
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth';
import { Button, Input, Alert, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import AvatarUpload from '@/components/AvatarUpload';

// User profile data from API
interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

function ProfileContent() {
  const router = useRouter();
  const { user: authUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Helper: Get dashboard URL based on user role
  const getDashboardUrl = () => {
    if (!authUser?.role) return '/dashboard';

    switch (authUser.role.toLowerCase()) {
      case 'admin':
        return '/admin';
      case 'judge':
        return '/judge/dashboard';
      case 'founder':
      default:
        return '/dashboard';
    }
  };

  // Fetch full user profile from API
  const { data: profileData, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['user-profile', authUser?.id],
    queryFn: async () => {
      console.log('Fetching user profile from API...');
      const response = await api.get('/users/me');
      console.log('API response:', response.data);
      return response.data;
    },
    enabled: !!authUser?.id && isAuthenticated,
  });

  // Fetch user avatar URL
  const { data: avatarData } = useQuery({
    queryKey: ['user-avatar', authUser?.id],
    queryFn: async () => {
      const response = await api.get('/users/me/avatar-url');
      return response.data;
    },
    enabled: !!authUser?.id && isAuthenticated,
  });

  // Mutation to update profile (username and/or email)
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username?: string; email?: string; current_password?: string }) => {
      const response = await api.patch('/users/me', data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Different success message based on what changed
      if (variables.email) {
        setSuccessMessage('Email updated successfully. A notification has been sent to your old email address.');
      } else {
        setSuccessMessage('Username updated successfully!');
      }

      setUsernameError('');
      setEmailError('');
      setPasswordError('');
      setCurrentPassword('');

      // Update formData with the new values from the server response
      // This immediately hides the password field and updates the form
      if (formData) {
        setFormData({
          ...formData,
          username: data.username || formData.username,
          email: data.email || formData.email,
        });
      }

      // Refresh user profile data
      queryClient.invalidateQueries({ queryKey: ['user-profile', authUser?.id] });

      // Clear success message after 5 seconds (longer for email message)
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error: any) => {
      console.error('Failed to update profile:', error);
      const message = error.response?.data?.detail || 'Failed to update profile. Please try again.';

      // Try to determine which field caused the error
      if (message.toLowerCase().includes('password')) {
        setPasswordError(message);
      } else if (message.toLowerCase().includes('email')) {
        setEmailError(message);
      } else if (message.toLowerCase().includes('username')) {
        setUsernameError(message);
      } else {
        setUsernameError(message);
      }

      setSuccessMessage('');
    },
  });

  // Form state - will be initialized with user data
  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    avatar: string;
  } | null>(null);

  // Password field for email change
  const [currentPassword, setCurrentPassword] = useState('');

  // Avatar change state
  const [pendingAvatar, setPendingAvatar] = useState<Blob | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // Initialize form data when profile is loaded (run only once when profileData changes)
  useEffect(() => {
    console.log('=== PROFILE PAGE DEBUG ===');
    console.log('Auth user from JWT:', authUser);
    console.log('Profile data from API:', profileData);
    console.log('Is loading:', isLoading);
    console.log('Error:', error);
    console.log('Current formData:', formData);

    // Only initialize if we have profileData AND formData hasn't been set yet
    if (profileData && profileData.username && profileData.email && !formData) {
      console.log('✅ Initializing form with API data');
      setFormData({
        username: profileData.username,
        email: profileData.email,
        avatar: profileData.username.slice(0, 2).toUpperCase(),
      });
    }
  }, [profileData]); // Only depend on profileData to avoid infinite loop


  // Validate username
  const validateUsername = (username: string): string | null => {
    if (!username || username.trim() === '') {
      return 'Username cannot be empty';
    }

    if (username.length < 3 || username.length > 20) {
      return 'Username must be between 3 and 20 characters';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }

    if (/\s/.test(username)) {
      return 'Username cannot contain spaces';
    }

    return null;
  };

  // Validate email
  const validateEmail = (email: string): string | null => {
    if (!email || email.trim() === '') {
      return 'Email cannot be empty';
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }

    return null;
  };

  // Handle avatar image selection (not uploaded yet)
  const handleAvatarSelected = (imageBlob: Blob | null) => {
    setPendingAvatar(imageBlob);
    setRemoveAvatar(false);
  };

  // Handle avatar removal
  const handleAvatarRemove = () => {
    setPendingAvatar(null);
    setRemoveAvatar(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setUsernameError('');
    setEmailError('');
    setPasswordError('');

    if (!formData || !profileData) return;

    // Check if anything changed
    const usernameChanged = formData.username !== profileData.username;
    const emailChanged = formData.email !== profileData.email;
    const avatarChanged = pendingAvatar !== null || removeAvatar;

    // Validate username if changed
    if (usernameChanged) {
      const usernameValidationErr = validateUsername(formData.username);
      if (usernameValidationErr) {
        setUsernameError(usernameValidationErr);
        return;
      }
    }

    // Validate email if changed
    if (emailChanged) {
      const emailValidationErr = validateEmail(formData.email);
      if (emailValidationErr) {
        setEmailError(emailValidationErr);
        return;
      }

      // Require password for email change
      if (!currentPassword || currentPassword.trim() === '') {
        setPasswordError('Current password is required to change email');
        return;
      }
    }

    try {
      // Handle avatar upload if pending
      if (pendingAvatar) {
        const avatarFormData = new FormData();
        avatarFormData.append('file', pendingAvatar, 'avatar.jpg');
        await api.post('/users/me/avatar', avatarFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // Handle avatar deletion if flagged
      if (removeAvatar) {
        await api.delete('/users/me/avatar');
      }

      // Handle username/email update if changed
      if (usernameChanged || emailChanged) {
        const updateData: { username?: string; email?: string; current_password?: string } = {};

        if (usernameChanged) {
          updateData.username = formData.username;
        }

        if (emailChanged) {
          updateData.email = formData.email;
          updateData.current_password = currentPassword;
        }

        updateProfileMutation.mutate(updateData);
      }

      // Invalidate avatar query to refresh display
      if (avatarChanged) {
        queryClient.invalidateQueries({ queryKey: ['user-avatar', authUser?.id] });
      }

      // Clear pending avatar state
      setPendingAvatar(null);
      setRemoveAvatar(false);

      // Set success message
      if (avatarChanged && !usernameChanged && !emailChanged) {
        setSuccessMessage('Profile photo updated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const message = error.response?.data?.detail || 'Failed to update profile. Please try again.';
      setUsernameError(message);
    }
  };

  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state if profile fetch failed
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Alert variant="error">
          <p className="font-semibold">Failed to load profile</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'Unable to fetch user data'}
          </p>
          <Button
            onClick={() => router.push(getDashboardUrl())}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </Alert>
      </div>
    );
  }

  // Show message if form data is not ready
  if (!formData || !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load profile data</p>
          <Button
            onClick={() => router.push(getDashboardUrl())}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push(getDashboardUrl())}
          className="mb-8 flex items-center text-brand-600 hover:text-brand-700 font-semibold transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Edit Profile</h1>
          <p className="mt-2 text-lg text-gray-600">
            Update your account information
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert variant="success" className="mb-8">
            {successMessage}
          </Alert>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Profile Photo
                </label>
                <AvatarUpload
                  currentAvatarUrl={avatarData?.avatar_url}
                  username={formData?.username || ''}
                  onImageSelected={handleAvatarSelected}
                  onRemove={handleAvatarRemove}
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    setUsernameError('');
                  }}
                  className={`w-full ${usernameError ? 'border-red-500' : ''}`}
                  placeholder="username"
                />
                {usernameError && (
                  <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setEmailError('');
                  }}
                  className={`w-full ${emailError ? 'border-red-500' : ''}`}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Valid email address required
                </p>
              </div>

              {/* Current Password (always rendered, hidden when not needed) */}
              <div className={formData.email !== profileData.email ? 'block' : 'hidden'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password (required to change email)
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className={`w-full ${passwordError ? 'border-red-500' : ''}`}
                  placeholder="Enter your current password"
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Your current password is required for security purposes
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8">
              <Button
                type="submit"
                variant="primary"
                disabled={
                  updateProfileMutation.isPending ||
                  (formData.username === profileData.username && formData.email === profileData.email && !pendingAvatar && !removeAvatar) ||
                  !formData.username ||
                  !formData.email ||
                  (formData.email !== profileData.email && !currentPassword)
                }
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Account Information */}
        <div className="mt-8 bg-white rounded-2xl shadow-card p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Account Information
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
              <span className="text-sm font-medium text-slate-600">Account Type</span>
              <span className="text-sm font-semibold text-slate-900 capitalize px-3 py-1 bg-slate-100 rounded-full">
                {profileData.role}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
              <span className="text-sm font-medium text-slate-600">Member Since</span>
              <span className="text-sm font-semibold text-slate-900">
                {new Date(profileData.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
