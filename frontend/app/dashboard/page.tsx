'use client';

/**
 * Founder Dashboard page
 */

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { Loading, Alert, ExpandableSection } from '@/components/ui';
import { getMySubmissions, getMyWinnings, type Submission, type UserWinning } from '@/lib/api/submissions';

function DashboardContent() {
  const { user } = useAuth();

  // Collapsible section state (drafts expanded by default, others collapsed)
  const [expandedSections, setExpandedSections] = useState({
    drafts: true,
    active: false,
    completed: false,
  });

  // Payment status checking state
  const [checkingPaymentId, setCheckingPaymentId] = useState<number | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
    shouldRefresh: boolean;
  }>({
    isOpen: false,
    type: 'success',
    message: '',
    shouldRefresh: false,
  });

  // Check payment status with Stripe
  const checkPaymentStatus = async (submissionId: number) => {
    setCheckingPaymentId(submissionId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/submissions/${submissionId}/check-payment-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to check payment status');
      }

      const result = await response.json();

      // Show modal with result
      setPaymentModal({
        isOpen: true,
        type: result.submission_status === 'submitted' ? 'success' : 'error',
        message: result.message,
        shouldRefresh: result.submission_status === 'submitted',
      });
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      setPaymentModal({
        isOpen: true,
        type: 'error',
        message: error.message || 'Failed to check payment status. Please try again.',
        shouldRefresh: false,
      });
    } finally {
      setCheckingPaymentId(null);
    }
  };

  // Close payment status modal
  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, type: 'success', message: '', shouldRefresh: false });
    if (paymentModal.shouldRefresh) {
      window.location.reload();
    }
  };

  // Fetch user's submissions
  const {
    data: submissions = [],
    isLoading: isLoadingSubmissions,
    error: submissionsError,
  } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => getMySubmissions(),
  });

  // Fetch user's winnings
  const {
    data: winnings = [],
    isLoading: isLoadingWinnings,
    error: winningsError,
  } = useQuery({
    queryKey: ['my-winnings'],
    queryFn: () => getMyWinnings(),
  });

  const isLoading = isLoadingSubmissions || isLoadingWinnings;
  const error = submissionsError || winningsError;

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Dashboard Data:', {
      totalSubmissions: submissions.length,
      submissions,
      winnings,
    });

    // Debug competition images
    submissions.forEach((submission: Submission, index: number) => {
      console.log(`Submission ${index + 1}:`, {
        title: submission.title,
        competition: submission.competition?.title,
        imageUrl: submission.competition?.image_url,
        hasImage: !!submission.competition?.image_url,
      });
    });
  }

  // Helper function to get place text with ordinal suffix
  const getPlaceText = (placement: string | number): string => {
    // Handle string-based placements (e.g., 'first', 'second')
    const labels: Record<string, string> = {
      'first': '1st',
      'second': '2nd',
      'third': '3rd',
      'fourth': '4th',
      'fifth': '5th',
      'sixth': '6th',
      'seventh': '7th',
      'eighth': '8th',
      'ninth': '9th',
      'tenth': '10th',
    };

    if (typeof placement === 'string' && labels[placement]) {
      return labels[placement];
    }

    // Handle numeric placements (e.g., 1, 2, 3)
    const num = typeof placement === 'number' ? placement : parseInt(placement);
    if (!isNaN(num)) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = num % 100;
      return num + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Fallback: return as-is
    return String(placement);
  };

  // Categorize submissions
  const draftSubmissions = submissions.filter(
    (s: Submission) => {
      const statusLower = s.status.toLowerCase();
      return statusLower === 'draft' || statusLower === 'pending_payment';
    }
  );

  const activeSubmissions = submissions.filter((s: Submission) => {
    const compStatus = s.competition?.status?.toLowerCase();
    const isActiveStatus = (s.status === 'submitted' || s.status === 'SUBMITTED' || s.status === 'under_review' || s.status === 'UNDER_REVIEW');
    const isActiveCompetition = (compStatus === 'active' || compStatus === 'closed' || compStatus === 'judging');
    return isActiveStatus && isActiveCompetition;
  });

  const completedSubmissions = submissions.filter((s: Submission) => {
    const compStatus = s.competition?.status?.toLowerCase();
    return compStatus === 'complete';
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('Categorized Submissions:', {
      drafts: draftSubmissions.length,
      active: activeSubmissions.length,
      completed: completedSubmissions.length,
      draftSubmissions,
      activeSubmissions,
      completedSubmissions,
    });
  }

  // Calculate stats
  const totalSubmissions = submissions.length;

  // Count unique competitions in active submissions
  const uniqueActiveCompetitionIds = new Set(
    activeSubmissions.map((s: Submission) => s.competition_id)
  );
  const activeCompetitions = uniqueActiveCompetitionIds.size;

  const totalWinnings = winnings
    .filter((w: UserWinning) => w.status === 'completed' || w.status === 'COMPLETED')
    .reduce((sum: number, w: UserWinning) => sum + w.amount, 0);

  if (process.env.NODE_ENV === 'development') {
    console.log('Stats:', {
      totalSubmissions,
      activeCompetitions,
      totalWinnings,
      uniqueActiveCompetitionIds: Array.from(uniqueActiveCompetitionIds),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Alert variant="error">
          <p className="font-semibold">Failed to load dashboard</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">My Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Welcome back, {user?.username}!
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Submissions
                </p>
                <p className="text-2xl font-semibold text-gray-900">{totalSubmissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Active Competitions
                </p>
                <p className="text-2xl font-semibold text-gray-900">{activeCompetitions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Winnings
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${totalWinnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Drafts & Pending Section */}
          <ExpandableSection
            title="Drafts & Pending"
            count={draftSubmissions.length}
            isExpanded={expandedSections.drafts}
            onToggle={() => setExpandedSections(prev => ({ ...prev, drafts: !prev.drafts }))}
            badgeColor="blue"
            emptyMessage="You have no draft submissions"
          >
            <div className="space-y-4">
              {draftSubmissions.map((submission: Submission) => (
                <div
                  key={submission.id}
                  className="relative bg-white rounded-2xl px-8 py-4 min-h-[140px] shadow-card hover:shadow-card-hover transition-shadow overflow-hidden border border-slate-200"
                >
                  {/* Background image/gradient - RIGHT side fading left */}
                  {submission.competition?.image_url ? (
                    <div className="absolute inset-y-0 right-0 w-1/4">
                      <img
                        src={submission.competition.image_url}
                        alt=""
                        className="w-full h-full object-cover opacity-50"
                        style={{
                          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Default gradient - EXACT same as competition cards */}
                      <div className="absolute inset-y-0 right-0 w-1/4">
                        <div className="relative h-full bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200">
                          {/* Subtle decorative plant pattern */}
                          <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-4 right-4 text-8xl">🌱</div>
                            <div className="absolute bottom-4 right-8 text-8xl">🌿</div>
                          </div>
                        </div>
                      </div>
                      {/* Gradient fade - use via-white/80 instead of to-white */}
                      <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-transparent via-white/50 to-white/90" />
                    </>
                  )}

                  {/* Content - must be relative with z-index */}
                  <div className="relative z-10 flex items-center justify-between gap-6">
                    {/* Left side: Competition title, domain tags, submission title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900 truncate">
                          {submission.competition?.title || 'Competition'}
                        </h3>

                        {/* Domain tags */}
                        {submission.competition?.domain && (
                          <div className="flex gap-2">
                            {submission.competition.domain.split(',').map((domain, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                              >
                                {domain.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-600">
                        Submission: {submission.title}
                      </p>
                    </div>

                    {/* Right side: Action button */}
                    <div className="flex-shrink-0 relative z-10 isolate">
                      {submission.status.toLowerCase() === 'pending_payment' ? (
                        <button
                          onClick={() => checkPaymentStatus(submission.id)}
                          disabled={checkingPaymentId === submission.id}
                          className="px-6 py-2 bg-brand-500 text-white rounded-full font-semibold hover:bg-brand-600 transition-colors duration-200 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {checkingPaymentId === submission.id ? 'Checking...' : 'Check Payment Status'}
                        </button>
                      ) : (
                        <Link
                          href={`/submissions/${submission.id}`}
                          className="px-6 py-2 bg-brand-500 text-white rounded-full font-semibold hover:bg-brand-600 transition-colors duration-200 backdrop-blur-md"
                        >
                          Complete Submission
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Active Competitions Section */}
          <ExpandableSection
            title="Active Competitions"
            count={activeSubmissions.length}
            isExpanded={expandedSections.active}
            onToggle={() => setExpandedSections(prev => ({ ...prev, active: !prev.active }))}
            badgeColor="green"
            emptyMessage="You have no submissions in active competitions"
          >
            <div className="space-y-4">
              {activeSubmissions.map((submission: Submission) => (
                <div
                  key={submission.id}
                  className="relative bg-white rounded-2xl px-8 py-4 min-h-[140px] shadow-card hover:shadow-card-hover transition-shadow overflow-hidden border border-slate-200"
                >
                  {/* Background image/gradient - RIGHT side fading left */}
                  {submission.competition?.image_url ? (
                    <div className="absolute inset-y-0 right-0 w-1/4">
                      <img
                        src={submission.competition.image_url}
                        alt=""
                        className="w-full h-full object-cover opacity-50"
                        style={{
                          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Default gradient - EXACT same as competition cards */}
                      <div className="absolute inset-y-0 right-0 w-1/4">
                        <div className="relative h-full bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200">
                          {/* Subtle decorative plant pattern */}
                          <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-4 right-4 text-8xl">🌱</div>
                            <div className="absolute bottom-4 right-8 text-8xl">🌿</div>
                          </div>
                        </div>
                      </div>
                      {/* Gradient fade - use via-white/80 instead of to-white */}
                      <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-transparent via-white/50 to-white/90" />
                    </>
                  )}

                  {/* Content - must be relative with z-index */}
                  <div className="relative z-10 flex items-center justify-between gap-6">
                    {/* Left side: Competition title, domain tags, submission title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900 truncate">
                          {submission.competition?.title || 'Competition'}
                        </h3>

                        {/* Domain tags */}
                        {submission.competition?.domain && (
                          <div className="flex gap-2">
                            {submission.competition.domain.split(',').map((domain, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                              >
                                {domain.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-600">
                        Submission: {submission.title}
                      </p>
                    </div>

                    {/* Right side: Action button */}
                    <div className="flex-shrink-0 relative z-10 isolate">
                      <Link
                        href={`/submissions/${submission.id}`}
                        className="px-6 py-2 bg-brand-500 text-white rounded-full font-semibold hover:bg-brand-600 transition-colors duration-200 backdrop-blur-md"
                      >
                        View Submission
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Completed Competitions Section */}
          <ExpandableSection
            title="Completed Competitions"
            count={completedSubmissions.length}
            isExpanded={expandedSections.completed}
            onToggle={() => setExpandedSections(prev => ({ ...prev, completed: !prev.completed }))}
            badgeColor="gray"
            emptyMessage="You have no submissions in completed competitions"
          >
            <div className="space-y-4">
              {completedSubmissions.map((submission: Submission) => {
                const winning = winnings.find((w: UserWinning) => w.submission?.id === submission.id);

                return (
                  <div
                    key={submission.id}
                    className="relative bg-white rounded-2xl px-8 py-4 min-h-[140px] shadow-card hover:shadow-card-hover transition-shadow overflow-hidden border border-slate-200"
                  >
                    {/* Background image/gradient - RIGHT side fading left */}
                    {submission.competition?.image_url ? (
                      <div className="absolute inset-y-0 right-0 w-1/4">
                        <img
                          src={submission.competition.image_url}
                          alt=""
                          className="w-full h-full object-cover opacity-50"
                          style={{
                            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        {/* Default gradient - EXACT same as competition cards */}
                        <div className="absolute inset-y-0 right-0 w-1/4">
                          <div className="relative h-full bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200">
                            {/* Subtle decorative plant pattern */}
                            <div className="absolute inset-0 opacity-5">
                              <div className="absolute top-4 right-4 text-8xl">🌱</div>
                              <div className="absolute bottom-4 right-8 text-8xl">🌿</div>
                            </div>
                          </div>
                        </div>
                        {/* Gradient fade - use via-white/80 instead of to-white */}
                        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-transparent via-white/50 to-white/90" />
                      </>
                    )}

                    {/* Content - must be relative with z-index */}
                    <div className="relative z-10 flex items-center justify-between gap-6">
                      {/* Left side: Competition info, submission title, placement/score/prize */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900 truncate">
                            {submission.competition?.title || 'Competition'}
                          </h3>

                          {/* Domain tags */}
                          {submission.competition?.domain && (
                            <div className="flex gap-2">
                              {submission.competition.domain.split(',').map((domain, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                                >
                                  {domain.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-2">
                          Submission: {submission.title}
                        </p>

                        {/* Placement */}
                        {submission.placement && (
                          <div className="text-sm text-slate-600">
                            Placed: {getPlaceText(submission.placement)}
                          </div>
                        )}
                      </div>

                      {/* Right side: Action buttons */}
                      <div className="flex gap-3 flex-shrink-0 relative z-10 isolate">
                        <Link
                          href={`/submissions/${submission.id}`}
                          className="px-6 py-2 border-2 border-brand-500 text-brand-600 rounded-full font-semibold transition-colors duration-200 bg-white/90 backdrop-blur-md hover:border-brand-600"
                        >
                          View Submission
                        </Link>
                        <Link
                          href={`/submissions/${submission.id}/results`}
                          className="px-6 py-2 bg-brand-500 text-white rounded-full font-semibold hover:bg-brand-600 transition-colors duration-200 backdrop-blur-md"
                        >
                          View Results
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ExpandableSection>

        </div>
      </div>

      {/* Payment Status Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              {paymentModal.type === 'success' ? (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-red-600"
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
              )}
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-4">
              {paymentModal.type === 'success' ? 'Payment Confirmed!' : 'Payment Status'}
            </h3>

            {/* Message */}
            <p className="text-center text-gray-600 mb-8 leading-relaxed">
              {paymentModal.message}
            </p>

            {/* Action Button */}
            <button
              onClick={closePaymentModal}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                paymentModal.type === 'success'
                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                  : 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500'
              }`}
            >
              {paymentModal.shouldRefresh ? 'Continue' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRole="founder">
      <DashboardContent />
    </ProtectedRoute>
  );
}
