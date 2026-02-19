'use client';

/**
 * Public Submission Viewing Page
 * Shows submission details without scores/feedback (for public viewing)
 */

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { Loading, Alert, Button } from '@/components/ui';
import { getPublicSubmission, getPublicSubmissionVideo, type DetailedSubmission } from '@/lib/api/submissions';

function PublicSubmissionContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const submissionId = Number(params.id);

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

  // Fetch submission details
  const {
    data: submission,
    isLoading,
    error,
  } = useQuery<DetailedSubmission>({
    queryKey: ['submission-public', submissionId],
    queryFn: () => getPublicSubmission(submissionId),
    enabled: !!submissionId,
  });

  // Check if submission has video attachment
  const hasVideo = submission?.attachments?.some((att: any) => att.type === 'video');

  // Fetch video URL using public endpoint
  const {
    data: videoData,
    isLoading: videoLoading,
    error: videoError,
  } = useQuery<{ video_url: string; expires_in: number }>({
    queryKey: ['submission-public-video', submissionId],
    queryFn: () => getPublicSubmissionVideo(submissionId),
    enabled: !!submissionId && hasVideo,
  });

  // Helper: Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
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
            onClick={() => router.push(getDashboardUrl())}
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
            onClick={() => router.push(getDashboardUrl())}
            className="mt-4 bg-white text-red-600 border border-red-600 hover:bg-red-50"
          >
            Back to Dashboard
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <button
            onClick={() => router.push(getDashboardUrl())}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          {/* Competition Link */}
          <div className="mb-4">
            <span className="text-sm text-gray-600">
              from <Link
                href={`/competitions/${submission.competition_id}`}
                className="text-brand-600 hover:text-brand-800 font-medium"
              >
                {submission.competition?.title}
              </Link>
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {submission.title}
          </h1>

          {/* Owner Info */}
          {(submission.user || (submission as any).username) && (
            <p className="text-sm text-gray-600">
              by <span className="font-medium text-gray-900">
                {(submission as any).username || submission.user?.username}
              </span>
            </p>
          )}
        </div>

        {/* Video Section */}
        {hasVideo && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {videoLoading ? (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <Loading size="md" />
              </div>
            ) : videoError ? (
              <Alert variant="error">
                <p className="font-semibold">Video Error</p>
                <p className="text-sm mt-1">
                  {videoError instanceof Error ? videoError.message : 'Failed to load video'}
                </p>
              </Alert>
            ) : videoData?.video_url ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full"
                  src={videoData.video_url}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicSubmissionPage() {
  return (
    <ProtectedRoute>
      <PublicSubmissionContent />
    </ProtectedRoute>
  );
}
