'use client';

/**
 * Settings Page
 * Allows users to manage account settings and preferences
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth';
import { Button, Alert } from '@/components/ui';

function SettingsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Helper: Get dashboard URL based on user role
  const getDashboardUrl = () => {
    if (!user?.role) return '/dashboard';

    switch (user.role.toLowerCase()) {
      case 'admin':
        return '/admin';
      case 'judge':
        return '/judge/dashboard';
      case 'founder':
      default:
        return '/dashboard';
    }
  };

  // Settings state
  const [emailPreferences, setEmailPreferences] = useState({
    competitionUpdates: true,
    judgingAssignments: true,
    resultNotifications: true,
    marketingEmails: false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showSubmissions: true,
  });

  const handleSaveEmailPreferences = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // TODO: Implement API call to save email preferences
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccessMessage('Email preferences updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to update preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacySettings = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // TODO: Implement API call to save privacy settings
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccessMessage('Privacy settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push(getDashboardUrl())}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert variant="success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" className="mb-6">
            {errorMessage}
          </Alert>
        )}

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Account Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500 mt-1">
                  Update your password to keep your account secure
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  // TODO: Implement password change
                  alert('Password change functionality coming soon!');
                }}
              >
                Change
              </Button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  // TODO: Implement 2FA setup
                  alert('Two-factor authentication setup coming soon!');
                }}
              >
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Delete Account</p>
                <p className="text-sm text-gray-500 mt-1">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  // TODO: Implement account deletion
                  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    alert('Account deletion functionality coming soon!');
                  }
                }}
                className="text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Email Preferences */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Email Preferences
          </h2>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailPreferences.competitionUpdates}
                onChange={(e) => setEmailPreferences({ ...emailPreferences, competitionUpdates: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
              />
              <div>
                <p className="font-medium text-gray-900">Competition Updates</p>
                <p className="text-sm text-gray-500">
                  Receive notifications about new competitions and deadlines
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailPreferences.judgingAssignments}
                onChange={(e) => setEmailPreferences({ ...emailPreferences, judgingAssignments: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                disabled={user?.role !== 'judge'}
              />
              <div>
                <p className="font-medium text-gray-900">Judging Assignments</p>
                <p className="text-sm text-gray-500">
                  Get notified when you're assigned to judge submissions
                  {user?.role !== 'judge' && ' (Judge role only)'}
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailPreferences.resultNotifications}
                onChange={(e) => setEmailPreferences({ ...emailPreferences, resultNotifications: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
              />
              <div>
                <p className="font-medium text-gray-900">Result Notifications</p>
                <p className="text-sm text-gray-500">
                  Be notified when competition results are announced
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailPreferences.marketingEmails}
                onChange={(e) => setEmailPreferences({ ...emailPreferences, marketingEmails: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
              />
              <div>
                <p className="font-medium text-gray-900">Marketing Emails</p>
                <p className="text-sm text-gray-500">
                  Receive updates about new features and platform news
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSaveEmailPreferences}
              disabled={isSaving}
              variant="primary"
            >
              {isSaving ? 'Saving...' : 'Save Email Preferences'}
            </Button>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Privacy Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Profile Visibility
              </label>
              <select
                value={privacySettings.profileVisibility}
                onChange={(e) => setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="public">Public - Anyone can view</option>
                <option value="registered">Registered Users Only</option>
                <option value="private">Private - Only me</option>
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.showEmail}
                onChange={(e) => setPrivacySettings({ ...privacySettings, showEmail: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
              />
              <div>
                <p className="font-medium text-gray-900">Show Email on Profile</p>
                <p className="text-sm text-gray-500">
                  Make your email address visible to other users
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.showSubmissions}
                onChange={(e) => setPrivacySettings({ ...privacySettings, showSubmissions: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
              />
              <div>
                <p className="font-medium text-gray-900">Show My Submissions</p>
                <p className="text-sm text-gray-500">
                  Display your competition submissions on your profile
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSavePrivacySettings}
              disabled={isSaving}
              variant="primary"
            >
              {isSaving ? 'Saving...' : 'Save Privacy Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
