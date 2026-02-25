'use client';

/**
 * Admin Judge Assignment page
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Loading, Alert } from '@/components/ui';
import { getCompetition } from '@/lib/api/competitions';
import { getAllUsers, assignJudges, getCompetitionSubmissions, getJudgeAssignments, reassignJudge } from '@/lib/api/admin';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Submission {
  id: number;
  competition_id: number;
  user_id: number;
  title: string;
  status: string;
}

interface JudgeAssignment {
  id: number;
  submission_id: number;
  submission_title: string;
  judge_id: number;
  judge_name: string;
}

function AssignJudgesContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const competitionId = Number(params.id);

  const [selectedJudgeIds, setSelectedJudgeIds] = useState<number[]>([]);
  const [submissionsPerJudge, setSubmissionsPerJudge] = useState(20);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAssignments, setShowAssignments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Individual reassignment state
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<JudgeAssignment | null>(null);
  const [newJudgeId, setNewJudgeId] = useState<number | null>(null);

  // Fetch competition details
  const {
    data: competition,
    isLoading: isLoadingCompetition,
    error: competitionError,
  } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => getCompetition(competitionId),
    enabled: !!competitionId,
  });

  // Fetch all users
  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ['all-users'],
    queryFn: getAllUsers,
  });

  // Fetch all submissions for this competition
  const {
    data: submissions,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
  } = useQuery({
    queryKey: ['competition-submissions', competitionId],
    queryFn: () => getCompetitionSubmissions(competitionId),
    enabled: !!competitionId,
  });

  // Fetch judge assignments for this competition
  const {
    data: judgeAssignments,
    isLoading: isLoadingAssignments,
    error: assignmentsError,
  } = useQuery({
    queryKey: ['judge-assignments', competitionId],
    queryFn: () => getJudgeAssignments(competitionId),
    enabled: !!competitionId,
  });

  // Filter for judges and admins
  const allJudges = users?.filter((user: User) => user.role === 'judge' || user.role === 'admin') || [];

  // Apply search filter
  const judges = allJudges.filter((user: User) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  // Calculate required judges based on submissions per judge
  const totalSubmissions = competition?.current_entries || 0;
  const requiredJudges = totalSubmissions > 0 ? Math.ceil(totalSubmissions / submissionsPerJudge) : 0;

  // Calculate workload for each judge
  const calculateJudgeWorkload = (judgeIndex: number): number => {
    if (requiredJudges === 0) return 0;
    const baseWorkload = Math.floor(totalSubmissions / requiredJudges);
    const remainder = totalSubmissions % requiredJudges;
    // First 'remainder' judges get one extra submission
    return judgeIndex < remainder ? baseWorkload + 1 : baseWorkload;
  };

  // Assign judges mutation
  const assignMutation = useMutation({
    mutationFn: (assignments: Array<{ judge_id: number; submission_ids: number[] }>) =>
      assignJudges(competitionId, { assignments }, true), // replace=true
    onSuccess: () => {
      setShowConfirmModal(false);
      setSuccessMessage('Judges assigned successfully!');
      setErrorMessage('');
      setShowAssignments(true);

      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['judge-assignments', competitionId] });

      // IMPORTANT: Invalidate judge dashboard queries for ALL judges
      // This ensures both old and new judges see updated assignments
      queryClient.invalidateQueries({ queryKey: ['judgeAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['judge-submissions', competitionId] });

      // Redirect after short delay so user can see success message
      setTimeout(() => {
        router.push(`/admin/competitions/${competitionId}`);
      }, 1500); // 1.5 second delay
    },
    onError: (error: any) => {
      // Extract error message from multiple possible formats
      let message = 'Failed to assign judges';

      const detail = error.response?.data?.detail;

      // Handle FastAPI validation errors (array format)
      if (Array.isArray(detail)) {
        // Extract messages from validation error array
        const messages = detail.map((err: any) => {
          if (err.msg) return err.msg;
          if (typeof err === 'string') return err;
          return JSON.stringify(err);
        });

        // Combine multiple errors with line breaks
        message = messages.length > 0 ? messages.join('\n') : 'Validation error occurred';
      }
      // Handle simple string detail
      else if (typeof detail === 'string') {
        message = detail;
      }
      // Handle alternative message field
      else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      // Handle string response data
      else if (typeof error.response?.data === 'string') {
        message = error.response.data;
      }
      // Fallback to error message
      else if (error.message) {
        message = error.message;
      }

      setErrorMessage(message);
      setSuccessMessage('');
    },
  });

  // Reassign judge mutation
  const reassignMutation = useMutation({
    mutationFn: ({ assignmentId, newJudgeId }: { assignmentId: number; newJudgeId: number }) =>
      reassignJudge(assignmentId, newJudgeId),
    onSuccess: () => {
      setSuccessMessage('Judge reassigned successfully!');
      setErrorMessage('');
      setShowReassignModal(false);
      setSelectedAssignment(null);
      setNewJudgeId(null);

      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['judge-assignments', competitionId] });

      // IMPORTANT: Invalidate judge dashboard queries for ALL judges
      // This ensures both old and new judges see updated assignments
      queryClient.invalidateQueries({ queryKey: ['judgeAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['judge-submissions', competitionId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to reassign judge';
      setErrorMessage(message);
      setSuccessMessage('');
    },
  });

  const handleToggleJudge = (judgeId: number) => {
    setSelectedJudgeIds((prev) => {
      // If trying to add and already at limit, don't allow
      if (!prev.includes(judgeId) && prev.length >= requiredJudges) {
        return prev;
      }
      return prev.includes(judgeId)
        ? prev.filter((id) => id !== judgeId)
        : [...prev, judgeId];
    });
    // Clear error when user makes changes
    setErrorMessage('');
  };

  // Validation function to check if assignment configuration is valid
  const isAssignmentValid = (): boolean => {
    console.log('=== isAssignmentValid Debug ===');
    console.log('selectedJudgeIds.length:', selectedJudgeIds.length);
    console.log('requiredJudges:', requiredJudges);
    console.log('submissionsPerJudge:', submissionsPerJudge);

    if (totalSubmissions === 0) {
      console.log('❌ Validation failed: No submissions');
      return false;
    }

    // Simple validation: must have exactly the required number of judges
    if (selectedJudgeIds.length !== requiredJudges) {
      console.log(
        `❌ Validation failed: Need exactly ${requiredJudges} judges, ${selectedJudgeIds.length} selected`
      );
      return false;
    }

    console.log('✅ Validation passed');
    return true;
  };

  const handleAssign = () => {
    // Clear previous error
    setErrorMessage('');

    // Simple validation: must have exactly the required number of judges
    if (selectedJudgeIds.length !== requiredJudges) {
      setErrorMessage(
        `You must select exactly ${requiredJudges} judge${requiredJudges !== 1 ? 's' : ''} for ${submissionsPerJudge} submissions per judge`
      );
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmAssignment = () => {
    setShowConfirmModal(false);

    // Get all submission IDs
    if (!submissions || submissions.length === 0) {
      setErrorMessage('No submissions found for this competition');
      return;
    }

    const submissionIds = submissions.map((s: Submission) => s.id);

    // Shuffle submissions randomly using Fisher-Yates algorithm
    const shuffled = [...submissionIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Distribute submissions among judges
    const assignments: Array<{ judge_id: number; submission_ids: number[] }> = [];
    const baseWorkload = Math.floor(shuffled.length / selectedJudgeIds.length);
    const remainder = shuffled.length % selectedJudgeIds.length;

    let currentIndex = 0;
    selectedJudgeIds.forEach((judgeId, judgeIndex) => {
      // First 'remainder' judges get one extra submission
      const workload = judgeIndex < remainder ? baseWorkload + 1 : baseWorkload;
      const judgeSubmissions = shuffled.slice(currentIndex, currentIndex + workload);

      assignments.push({
        judge_id: judgeId,
        submission_ids: judgeSubmissions,
      });

      currentIndex += workload;
    });

    // Call mutation with assignments
    assignMutation.mutate(assignments);
  };

  // Handler functions for individual reassignment
  const handleOpenReassignModal = (assignment: JudgeAssignment) => {
    setSelectedAssignment(assignment);
    setNewJudgeId(assignment.judge_id); // Default to current judge
    setShowReassignModal(true);
  };

  const handleCloseReassignModal = () => {
    setShowReassignModal(false);
    setSelectedAssignment(null);
    setNewJudgeId(null);
  };

  const handleConfirmReassignment = () => {
    if (!selectedAssignment || !newJudgeId) return;

    reassignMutation.mutate({
      assignmentId: selectedAssignment.id,
      newJudgeId: newJudgeId,
    });
  };

  // Filter assignments by search query (submission ID, title, or judge name)
  const filteredAssignments = judgeAssignments?.filter((assignment: JudgeAssignment) => {
    if (!assignmentSearchQuery) return true;
    const query = assignmentSearchQuery.toLowerCase();
    return (
      assignment.submission_id.toString().includes(query) ||
      assignment.submission_title.toLowerCase().includes(query) ||
      assignment.judge_name.toLowerCase().includes(query)
    );
  }) || [];

  const isLoading = isLoadingCompetition || isLoadingUsers || isLoadingSubmissions;
  const error = competitionError || usersError || submissionsError;

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
            <p className="font-semibold">Failed to load data</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'An error occurred'}
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

  // Calculate button disabled state
  const isValid = isAssignmentValid();
  const isButtonDisabled = !isValid || assignMutation.isPending;

  console.log('=== Button State Debug ===');
  console.log('isValid:', isValid);
  console.log('assignMutation.isPending:', assignMutation.isPending);
  console.log('isButtonDisabled:', isButtonDisabled);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/admin/competitions/${competitionId}`)}
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
          Back to Competition
        </button>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert variant="error" className="mb-4">
            {errorMessage}
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Assign Judges</h1>
          <p className="mt-2 text-lg text-gray-600">
            Select judges for <span className="font-semibold">{competition.title}</span>
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Assignment Configuration Card */}
            <Card title="Assignment Configuration">
              <div className="space-y-4">
                {/* Submissions per Judge Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submissions per Judge
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalSubmissions}
                    value={submissionsPerJudge}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > 0) {
                        setSubmissionsPerJudge(value);
                        setErrorMessage('');
                        // Clear selections when changing workload
                        setSelectedJudgeIds([]);
                      }
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Each judge will review approximately {submissionsPerJudge} submission{submissionsPerJudge !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Required Judges Display */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Judges Required</h4>
                  <p className="text-sm text-blue-800">
                    With <span className="font-semibold">{totalSubmissions}</span> submission{totalSubmissions !== 1 ? 's' : ''}, you need to select exactly{' '}
                    <span className="font-semibold text-lg">{requiredJudges}</span> judge{requiredJudges !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Assignment Preview */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Assignment Preview</h4>

                  {/* Selected Judges Workload */}
                  {selectedJudgeIds.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-gray-700">Selected Judges:</p>
                      {selectedJudgeIds.map((judgeId, index) => {
                        const judge = allJudges.find((j: User) => j.id === judgeId);
                        const workload = calculateJudgeWorkload(index);
                        return (
                          <div key={judgeId} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900">{judge?.username || 'Judge'}</span>
                              {judge && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                    judge.role === 'admin'
                                      ? 'bg-brand-100 text-brand-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {judge.role === 'admin' ? 'Admin' : 'Judge'}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-brand-600">~{workload} submission{workload !== 1 ? 's' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Validation Messages */}
                  {selectedJudgeIds.length !== requiredJudges && selectedJudgeIds.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-yellow-800 font-medium">
                          {selectedJudgeIds.length < requiredJudges
                            ? `Select ${requiredJudges - selectedJudgeIds.length} more judge${requiredJudges - selectedJudgeIds.length !== 1 ? 's' : ''}`
                            : `You have ${selectedJudgeIds.length - requiredJudges} too many judges selected`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Success Indicator */}
                  {selectedJudgeIds.length === requiredJudges && requiredJudges > 0 && (
                    <div className="mt-3 flex items-center text-sm">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-700 font-medium">Ready to assign! All submissions will be covered.</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Available Judges Card */}
            <Card title="Available Judges">
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search judges by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 text-gray-400 hover:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Count Display */}
                {searchQuery && (
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{judges.length}</span> of{' '}
                    <span className="font-semibold">{allJudges.length}</span> judge{allJudges.length !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Judge List */}
                {judges.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {searchQuery ? 'No judges found matching your search' : 'No judges available'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchQuery ? 'Try a different search term' : 'Create judge accounts first'}
                    </p>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {judges.map((judge: User) => (
                    <label
                      key={judge.id}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedJudgeIds.includes(judge.id)
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-brand-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedJudgeIds.includes(judge.id)}
                        onChange={() => handleToggleJudge(judge.id)}
                        className="h-5 w-5 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {judge.username}
                              </p>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  judge.role === 'admin'
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {judge.role === 'admin' ? 'Admin' : 'Judge'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{judge.email}</p>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">{selectedJudgeIds.length}</span>{' '}
                    judge(s) selected
                  </p>
                </div>
              </div>
            </Card>

            {/* Assign Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleAssign}
                disabled={isButtonDisabled}
                className="bg-brand-600 hover:bg-brand-700 text-lg py-3 px-8"
              >
                {assignMutation.isPending
                  ? 'Assigning...'
                  : `Assign ${selectedJudgeIds.length} Judge${selectedJudgeIds.length !== 1 ? 's' : ''}`}
              </Button>
            </div>

            {/* Assignment Results (shown after successful assignment) */}
            {showAssignments && (
              <Card title="Judge Assignments" className="mt-6">
                <div className="p-6 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-900 text-lg">Judge assignments replaced successfully!</p>
                      <p className="text-sm text-green-700 mt-1">
                        {selectedJudgeIds.length} judge{selectedJudgeIds.length !== 1 ? 's have' : ' has'} been assigned to review submissions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-brand-50 rounded-lg border border-brand-200">
                      <p className="text-sm text-brand-600 font-medium">Total Submissions</p>
                      <p className="text-2xl font-bold text-brand-900 mt-1">
                        {totalSubmissions}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">Assigned Judges</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        {selectedJudgeIds.length}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Assignment Details</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>✓ Submissions per Judge: <span className="font-semibold">~{submissionsPerJudge}</span></p>
                      <p>✓ Total Submissions: <span className="font-semibold">{totalSubmissions}</span></p>
                      <p>✓ Assigned Judges: <span className="font-semibold">{selectedJudgeIds.length}</span></p>
                      <p className="text-gray-600 italic mt-3">
                        Judges can now access their assignments from the Judge Dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Redirecting to competition management in 3 seconds...
                    </p>
                    <Button
                      onClick={() => router.push(`/admin/competitions/${competitionId}`)}
                      className="bg-brand-600 hover:bg-brand-700"
                    >
                      Back to Competition
                    </Button>
                  </div>
                </div>
              </Card>
            )}
        </div>

        {/* Individual Reassignments Section */}
        {judgeAssignments && judgeAssignments.length > 0 && (
          <div className="mt-12 pt-12 border-t-4 border-gray-300">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Individual Reassignments</h2>
              <p className="mt-2 text-lg text-gray-600">
                Reassign individual submissions to different judges
              </p>
            </div>

            <Card>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by submission ID, title, or judge name..."
                    value={assignmentSearchQuery}
                    onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  />
                  {assignmentSearchQuery && (
                    <button
                      onClick={() => setAssignmentSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 text-gray-400 hover:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Count Display */}
                {assignmentSearchQuery && (
                  <div className="mt-2 text-sm text-gray-600">
                    Showing <span className="font-semibold">{filteredAssignments.length}</span> of{' '}
                    <span className="font-semibold">{judgeAssignments.length}</span> assignment
                    {judgeAssignments.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Assignments Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Judge
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center">
                          <p className="text-gray-500">
                            {assignmentSearchQuery ? 'No assignments found matching your search' : 'No judge assignments yet'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((assignment: JudgeAssignment) => (
                        <tr key={assignment.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.submission_title}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {assignment.submission_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{assignment.judge_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              onClick={() => handleOpenReassignModal(assignment)}
                              className="bg-brand-600 hover:bg-brand-700 text-sm py-1 px-3"
                            >
                              Reassign
                            </Button>
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

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Judge Assignment
              </h3>
              <div className="mb-6 space-y-3">
                <p className="text-gray-600">
                  Are you sure you want to assign{' '}
                  <span className="font-semibold">{selectedJudgeIds.length}</span> judge
                  {selectedJudgeIds.length !== 1 ? 's' : ''} to{' '}
                  <span className="font-semibold">{totalSubmissions}</span> submission
                  {totalSubmissions !== 1 ? 's' : ''}? Each judge will review approximately{' '}
                  <span className="font-semibold">{submissionsPerJudge}</span> submission
                  {submissionsPerJudge !== 1 ? 's' : ''}.
                </p>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ This will REPLACE all existing judge assignments for this competition. Any previously assigned judges will be removed and replaced with the new assignments.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowConfirmModal(false)}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAssignment}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Confirm Assignment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reassignment Modal */}
        {showReassignModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reassign Judge
              </h3>
              <div className="mb-6 space-y-4">
                {/* Current Assignment Info */}
                <div className="p-3 bg-slate-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Submission:</p>
                  <p className="text-sm font-medium text-gray-900">{selectedAssignment.submission_title}</p>
                  <p className="text-sm text-gray-600 mt-2 mb-1">Currently Assigned To:</p>
                  <p className="text-sm font-medium text-gray-900">{selectedAssignment.judge_name}</p>
                </div>

                {/* New Judge Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Judge
                  </label>
                  <select
                    value={newJudgeId || ''}
                    onChange={(e) => setNewJudgeId(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  >
                    <option value="">Select a judge...</option>
                    {allJudges.map((judge: User) => (
                      <option key={judge.id} value={judge.id}>
                        {judge.username} - {judge.role === 'admin' ? 'Admin' : 'Judge'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={handleCloseReassignModal}
                  className="bg-gray-600 hover:bg-gray-700"
                  disabled={reassignMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReassignment}
                  className="bg-brand-600 hover:bg-brand-700"
                  disabled={!newJudgeId || newJudgeId === selectedAssignment.judge_id || reassignMutation.isPending}
                >
                  {reassignMutation.isPending ? 'Reassigning...' : 'Confirm Reassignment'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssignJudgesPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AssignJudgesContent />
    </ProtectedRoute>
  );
}
