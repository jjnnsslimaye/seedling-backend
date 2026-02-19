'use client';

/**
 * Founder Submission Detail page
 * Shows submission details, competition info, and video player
 * Styled to match submission form layout with read-only fields
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth';
import { Loading, Alert, Button } from '@/components/ui';
import { getSubmission, type DetailedSubmission } from '@/lib/api/submissions';
import { api } from '@/lib/api';

function SubmissionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const submissionId = Number(params.id);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Fetch submission details
  const {
    data: submission,
    isLoading,
    error,
  } = useQuery<DetailedSubmission>({
    queryKey: ['submission', submissionId],
    queryFn: () => getSubmission(submissionId),
    enabled: !!submissionId,
  });

  // Fetch video URL if submission has video
  useEffect(() => {
    const fetchVideoUrl = async () => {
      if (!submission?.attachments) return;

      const videoAttachment = submission.attachments.find(
        (att: any) => att.type === 'video'
      );

      if (!videoAttachment) return;

      try {
        const response = await api.get(`/submissions/${submissionId}/video-url`);
        setVideoUrl(response.data.video_url);
        setVideoError(null);
      } catch (err: any) {
        console.error('Error fetching video URL:', err);
        setVideoError('Failed to load video');
      }
    };

    fetchVideoUrl();
  }, [submission, submissionId]);

  // Check submission status and redirect drafts to editable form
  // IMPORTANT: This must be before early returns to maintain hooks order
  const statusLower = submission?.status?.toLowerCase() || '';
  const isDraft = statusLower === 'draft';
  const isPendingPayment = statusLower === 'pending_payment';

  useEffect(() => {
    if (isDraft && submission?.competition_id) {
      // DRAFT → Redirect to form for editing
      router.push(`/competitions/${submission.competition_id}/submit?draft_id=${submissionId}`);
    } else if (isPendingPayment && submission?.competition_id) {
      // PENDING_PAYMENT → Redirect to payment page
      router.push(`/competitions/${submission.competition_id}/submit/payment?submission_id=${submissionId}`);
    }
  }, [isDraft, isPendingPayment, submission?.competition_id, submissionId, router]);

  // Helper: Get place text
  const getPlaceText = (place: string): string => {
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

    // Handle numeric placements
    const num = typeof place === 'number' ? place : parseInt(place);
    if (!isNaN(num)) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = num % 100;
      return num + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    return labels[place] || place;
  };

  // Helper: Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Helper: Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          <p className="font-semibold">Failed to load submission</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-white text-red-600 border border-red-600 hover:bg-red-50"
          >
            Back to Dashboard
          </Button>
        </Alert>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Alert variant="error">
          <p className="font-semibold">Submission not found</p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-white text-red-600 border border-red-600 hover:bg-red-50"
          >
            Back to Dashboard
          </Button>
        </Alert>
      </div>
    );
  }

  // Additional status checks (after submission is loaded)
  const isCompleted = submission.competition?.status?.toLowerCase() === 'complete';

  // Show loading while redirecting drafts
  if (isDraft) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loading size="lg" />
          <p className="mt-4 text-gray-600">Redirecting to editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
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
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Your Submission
          </h1>
          <p className="text-lg text-slate-600">
            {submission.competition?.title}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Submission Details (read-only form style) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Submission Info Card */}
            <div className="bg-white rounded-2xl p-8 shadow-card">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Submission Details</h2>

              {/* Title and Description consolidated */}
              <div className="mb-6">
                <div className="px-4 py-3 bg-slate-50 rounded-2xl max-h-96 overflow-y-auto">
                  <div className="text-slate-900 font-semibold text-lg mb-6">
                    {submission.title}
                  </div>
                  <div className="text-slate-700 whitespace-pre-wrap">
                    {submission.description}
                  </div>
                </div>
              </div>

              {/* Public visibility */}
              {submission.is_public !== undefined && (
                <div className="mb-6">
                  <div className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-4 w-4 flex items-center justify-center">
                        {submission.is_public ? (
                          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">
                          {submission.is_public ? 'Public submission' : 'Private submission'}
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          {submission.is_public
                            ? 'Your video will be viewable by other participants on the results page. All other submission material and judges scores and feedback will remain private.'
                            : 'Only you and judges can view your submission details.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Video */}
              <div className="mb-6">
                {videoUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : videoError ? (
                  <div className="px-4 py-3 bg-red-50 rounded-xl text-red-600 border border-red-200">
                    {videoError}
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-slate-50 rounded-xl text-slate-500">
                    No video submitted
                  </div>
                )}
              </div>

              {/* Submission Date */}
              {submission.submitted_at && (
                <div className="text-sm text-slate-500">
                  Submitted: {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              )}
            </div>

            {/* View Results Buttons (if competition complete) */}
            {isCompleted && (
              <div className="flex gap-4">
                <Button
                  onClick={() => router.push(`/submissions/${submissionId}/results`)}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl text-lg font-semibold"
                >
                  View Your Results
                </Button>
                <Button
                  onClick={() => router.push(`/competitions/${submission.competition_id}/results`)}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl text-lg font-semibold"
                >
                  View Competition Results
                </Button>
              </div>
            )}
          </div>

          {/* Right Column - Competition Summary (same as submission form) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Competition Summary</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Competition</p>
                    <Link
                      href={`/competitions/${submission.competition_id}`}
                      className="font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {submission.competition?.title}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Domain</p>
                    <p className="font-semibold text-slate-900">
                      {submission.competition?.domain}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Entry Fee</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(submission.competition?.prize_pool ?
                        submission.competition.prize_pool / (submission.competition.prize_structure ?
                          Object.keys(submission.competition.prize_structure).length * 10 : 10
                        ) : 0
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Competition Status</p>
                    <p className="font-semibold text-slate-900 capitalize">
                      {submission.competition?.status?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Action message based on status */}
                {!isCompleted && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                    <p className="text-sm text-blue-700">
                      Your submission is being reviewed. You'll be notified when results are available.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubmissionDetailPage() {
  return (
    <ProtectedRoute requiredRole="founder">
      <SubmissionDetailContent />
    </ProtectedRoute>
  );
}
