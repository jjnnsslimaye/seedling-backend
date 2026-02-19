'use client';

/**
 * Admin Competition Management page
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Loading, Alert } from '@/components/ui';
import { getCompetition } from '@/lib/api/competitions';
import { updateCompetition, getCompetitionLeaderboard, getCompetitionSubmissions, deleteCompetition } from '@/lib/api/admin';

type CompetitionStatus = 'draft' | 'upcoming' | 'active' | 'closed' | 'judging' | 'complete';

function CompetitionManagementContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const competitionId = Number(params.id);

  const [selectedStatus, setSelectedStatus] = useState<CompetitionStatus | ''>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Fetch competition details
  const {
    data: competition,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => getCompetition(competitionId),
    enabled: !!competitionId,
  });

  // Fetch leaderboard data for judging statistics
  const {
    data: leaderboard,
    isLoading: isLoadingLeaderboard,
  } = useQuery({
    queryKey: ['competition-leaderboard', competitionId],
    queryFn: () => getCompetitionLeaderboard(competitionId),
    enabled: !!competitionId,
  });

  // Fetch submissions to check for winner status
  const {
    data: competitionSubmissions,
  } = useQuery({
    queryKey: ['competition-submissions', competitionId],
    queryFn: () => getCompetitionSubmissions(competitionId),
    enabled: !!competitionId,
  });

  // Check if winners have been selected
  const hasWinners = competitionSubmissions?.some((sub: any) => sub.status === 'winner') || false;

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: CompetitionStatus) =>
      updateCompetition(competitionId, { status: newStatus }),
    onSuccess: () => {
      setSuccessMessage('Competition status updated successfully!');
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competition-leaderboard', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competition-submissions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-competitions'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] }); // For browse page and cards
      setSelectedStatus('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || error.message || 'Failed to update status');
      setSuccessMessage('');
    },
  });

  // Delete competition mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteCompetition(competitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-competitions'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] }); // For browse page and cards
      router.push('/admin');
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || error.message || 'Failed to delete competition');
      setSuccessMessage('');
    },
  });

  const handleUpdateStatus = () => {
    if (!selectedStatus) return;
    // Store the selected status and show modal
    setPendingStatus(selectedStatus);
    setShowConfirmModal(true);
  };

  const confirmStatusUpdate = () => {
    if (!pendingStatus) return;

    // Validate the status change
    const validation = validateStatusChange(pendingStatus);

    if (!validation.valid) {
      setShowConfirmModal(false);
      setPendingStatus(null);
      setErrorMessage(validation.error || 'Invalid status change');
      return;
    }

    updateStatusMutation.mutate(pendingStatus as CompetitionStatus);
    setShowConfirmModal(false);
    setPendingStatus(null);
  };

  // Validation function for status changes
  const validateStatusChange = (newStatus: string): { valid: boolean; error?: string } => {
    if (!competition) return { valid: true };

    // Closed → Judging validations
    if (competition.status === 'closed' && newStatus === 'judging') {
      if (competition.current_entries === 0) {
        return {
          valid: false,
          error: 'Cannot start judging. No submissions received yet.'
        };
      }
      // TODO: Check if judges assigned (need API endpoint to check this)
      // For now, trust admin knows judges are assigned
    }

    // Judging → Complete validations
    if (competition.status === 'judging' && newStatus === 'complete') {
      // Check if winners have been selected
      const hasWinners = competitionSubmissions?.some((sub: any) => sub.status === 'winner') || false;
      if (!hasWinners) {
        return {
          valid: false,
          error: 'Cannot mark competition as Complete until winners have been selected. Please select winners first.'
        };
      }
    }

    return { valid: true };
  };

  // Helper function to determine allowed status transitions
  const getAllowedStatuses = (currentStatus: string): string[] => {
    const statusFlow = {
      draft: ['draft', 'upcoming', 'active'],
      upcoming: ['upcoming', 'active'],
      active: ['active', 'closed'],
      closed: ['closed', 'active', 'judging'], // Can reopen or move to judging
      judging: ['judging', 'complete'],
      complete: ['complete'] // Final state
    };

    return statusFlow[currentStatus as keyof typeof statusFlow] || [currentStatus];
  };

  // Status badge color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'closed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'judging':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'complete':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Calculate stats
  const submissionsCount = competition?.current_entries || 0;
  const platformRevenue = competition ? competition.prize_pool * (competition.platform_fee_percentage / 100) : 0;

  // Get allowed statuses for current competition
  const allowedStatuses = competition ? getAllowedStatuses(competition.status) : [];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !competition) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error">
            <p className="font-semibold">Failed to load competition</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'Competition not found'}
            </p>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/admin')}>
              Back to Manage Competitions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin')}
          className="mb-6 flex items-center text-brand-600 hover:text-brand-800 font-medium"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Manage Competitions
        </button>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{competition.title}</h1>
          <p className="mt-2 text-lg text-gray-600">Competition Management</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            {/* Competition Details Card */}
            <Card title="Competition Details">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <p className="text-gray-900">{competition.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <p className="text-gray-900 whitespace-pre-line">{competition.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {competition.domain.split(',').map((d, i) => (
                        <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800">
                          {d.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Fee
                    </label>
                    <p className="text-gray-900">${competition.entry_fee}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prize Pool
                    </label>
                    <p className="text-gray-900 font-semibold">
                      ${competition.prize_pool.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Fee
                    </label>
                    <p className="text-gray-900">{competition.platform_fee_percentage}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entries
                    </label>
                    <p className="text-gray-900">
                      {competition.current_entries} / {competition.max_entries}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(
                        competition.status
                      )} border`}
                    >
                      {competition.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Open Date
                    </label>
                    <p className="text-gray-900">
                      {new Date(competition.open_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline
                    </label>
                    <p className="text-gray-900">
                      {new Date(competition.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => router.push(`/admin/competitions/${competitionId}/edit`)}
                    className="bg-brand-600 hover:bg-brand-700"
                    disabled={competition.status !== 'draft'}
                  >
                    Edit Competition Details
                  </Button>
                </div>
              </div>
            </Card>

            {/* Status Management Card */}
            <Card title="Status Management">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Status
                  </label>
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-semibold capitalize ${getStatusColor(
                      competition.status
                    )} border-2`}
                  >
                    {competition.status}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <div className="flex gap-3">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as CompetitionStatus)}
                      className="flex-1 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">Select new status...</option>
                      <option value="draft" disabled={!allowedStatuses.includes('draft')}>
                        Draft
                      </option>
                      <option value="upcoming" disabled={!allowedStatuses.includes('upcoming')}>
                        Upcoming
                      </option>
                      <option value="active" disabled={!allowedStatuses.includes('active')}>
                        Active (Open for Submissions)
                      </option>
                      <option value="closed" disabled={!allowedStatuses.includes('closed')}>
                        Closed
                      </option>
                      <option value="judging" disabled={!allowedStatuses.includes('judging')}>
                        Judging
                      </option>
                      <option value="complete" disabled={!allowedStatuses.includes('complete')}>
                        Complete
                      </option>
                    </select>
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={
                        !selectedStatus ||
                        updateStatusMutation.isPending ||
                        !allowedStatuses.includes(selectedStatus)
                      }
                      className="bg-brand-600 hover:bg-brand-700"
                    >
                      {updateStatusMutation.isPending ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <Alert variant="error">
                    {errorMessage}
                  </Alert>
                )}

                {/* Validation Warning */}
                {selectedStatus &&
                 !allowedStatuses.includes(selectedStatus) &&
                 selectedStatus !== competition.status && (
                  <Alert variant="error">
                    Cannot move to "{selectedStatus}" status from "{competition.status}"
                  </Alert>
                )}

                {/* Warning Messages for Status Changes */}
                {competition.status === 'active' &&
                 selectedStatus === 'closed' &&
                 competition.current_entries === 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-yellow-600 mr-2 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Warning: No submissions yet
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Consider waiting for entries before closing the competition.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {competition.status === 'closed' && selectedStatus === 'judging' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-blue-600 mr-2 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Reminder: Judges assignment
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Make sure judges are assigned before starting the judging period.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Workflow Info */}
                <div className="p-4 bg-slate-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Status Workflow
                  </h4>
                  <p className="text-xs text-gray-600 mb-4">
                    Competitions progress through: Draft → Upcoming → Active → Closed → Judging → Completed
                  </p>

                  {/* Visual Status Flow */}
                  <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
                    {/* DRAFT */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 ${
                        competition.status === 'draft'
                          ? 'bg-gray-200 text-gray-900 border-gray-400 ring-2 ring-gray-500'
                          : 'bg-slate-50 text-gray-600 border-gray-200'
                      }`}>
                        DRAFT
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400 text-xl px-1">→</div>

                    {/* UPCOMING */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 ${
                        competition.status === 'upcoming'
                          ? 'bg-blue-200 text-blue-900 border-blue-400 ring-2 ring-blue-500'
                          : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        UPCOMING
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400 text-xl px-1">→</div>

                    {/* ACTIVE */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 ${
                        competition.status === 'active'
                          ? 'bg-green-200 text-green-900 border-green-400 ring-2 ring-green-500'
                          : 'bg-green-50 text-green-600 border-green-200'
                      }`}>
                        ACTIVE
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400 text-xl px-1">→</div>

                    {/* CLOSED */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 ${
                        competition.status === 'closed'
                          ? 'bg-yellow-200 text-yellow-900 border-yellow-400 ring-2 ring-yellow-500'
                          : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                      }`}>
                        CLOSED
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400 text-xl px-1">→</div>

                    {/* JUDGING */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 ${
                        competition.status === 'judging'
                          ? 'bg-purple-200 text-purple-900 border-purple-400 ring-2 ring-purple-500'
                          : 'bg-purple-50 text-purple-600 border-purple-200'
                      }`}>
                        JUDGING
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400 text-xl px-1">→</div>

                    {/* COMPLETED */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 ${
                        competition.status === 'complete'
                          ? 'bg-gray-200 text-gray-900 border-gray-400 ring-2 ring-gray-500'
                          : 'bg-slate-50 text-gray-600 border-gray-200'
                      }`}>
                        COMPLETED
                      </div>
                    </div>
                  </div>

                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>• <strong>Draft → Upcoming:</strong> Competition announced, not yet open</li>
                    <li>• <strong>Upcoming → Active:</strong> Opens for submissions</li>
                    <li>• <strong>Active → Closed:</strong> Stops new submissions</li>
                    <li>• <strong>Closed → Judging:</strong> Assign judges and start evaluation</li>
                    <li>• <strong>Judging → Completed:</strong> After winners selected and prizes distributed</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Danger Zone Card */}
            <Card title="Danger Zone">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Deleting a competition is permanent and cannot be undone. This will also delete all
                  submissions, scores, and related data.
                </p>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={competition.status !== 'draft'}
                >
                  Delete Competition
                </Button>
                {competition.status !== 'draft' && (
                  <p className="text-sm text-gray-500">
                    Only draft competitions can be deleted.
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN - 1/3 width, sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Quick Actions Card */}
              <Card title="Quick Actions">
                <div className="space-y-3">
                  <Button
                    onClick={() =>
                      router.push(`/admin/competitions/${competitionId}/assign-judges`)
                    }
                    disabled={
                      (competition.status !== 'closed' && competition.status !== 'judging') ||
                      hasWinners
                    }
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    Assign Judges
                  </Button>

                  <Button
                    onClick={() =>
                      router.push(`/admin/competitions/${competitionId}/leaderboard`)
                    }
                    disabled={competition.status !== 'judging' && competition.status !== 'complete'}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    View Leaderboard
                  </Button>

                  <div className="relative group">
                    <Button
                      onClick={() => router.push(`/admin/competitions/${competitionId}/distribute`)}
                      disabled={competition.status !== 'complete'}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Distribute Prizes
                    </Button>
                    {competition.status !== 'complete' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Competition must be marked Complete before distributing prizes
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Stats Card */}
              <Card title="Statistics">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Submissions
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {submissionsCount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Judged Submissions
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {isLoadingLeaderboard ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        leaderboard?.fully_judged_count ?? 0
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Prize Pool
                    </span>
                    <span className="text-lg font-semibold text-green-600">
                      ${competition.prize_pool.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600">
                      Platform Revenue
                    </span>
                    <span className="text-lg font-semibold text-brand-600">
                      ${platformRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Status Change
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to change the competition status from{' '}
                <span className="font-semibold capitalize">{competition.status}</span> to{' '}
                <span className="font-semibold capitalize">{pendingStatus}</span>?
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPendingStatus(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmStatusUpdate}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Confirm Change
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Competition?
              </h3>

              {/* Warning Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0"
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
                  <p className="text-sm text-yellow-800">
                    This action cannot be undone. This will permanently delete this competition.
                  </p>
                </div>
              </div>

              {/* Competition Title */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Competition:</p>
                <p className="font-semibold text-gray-900">{competition.title}</p>
              </div>

              {/* Confirmation Input */}
              <div className="mb-6">
                <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                    setErrorMessage('');
                  }}
                  className="bg-gray-600 hover:bg-gray-700"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    deleteMutation.mutate();
                  }}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={deleteConfirmText !== 'DELETE' || deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Competition'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompetitionManagementPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <CompetitionManagementContent />
    </ProtectedRoute>
  );
}
