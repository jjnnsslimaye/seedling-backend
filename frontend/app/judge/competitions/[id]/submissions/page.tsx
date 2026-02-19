'use client';

/**
 * Judge Submissions List page
 * Shows all submissions assigned to judge for a specific competition
 */

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Loading, Alert } from '@/components/ui';
import { getAssignedSubmissions } from '@/lib/api/judging';
import { getCompetition } from '@/lib/api/competitions';
import { Submission } from '@/lib/types';

interface SubmissionWithScore extends Submission {
  judge_score?: number;
  is_scored?: boolean;
  founder_username?: string;
}

function JudgeSubmissionsContent() {
  const params = useParams();
  const router = useRouter();
  const competitionId = Number(params.id);

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

  // Fetch assigned submissions
  const {
    data: submissions,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
  } = useQuery({
    queryKey: ['judge-submissions', competitionId],
    queryFn: () => getAssignedSubmissions(competitionId),
    enabled: !!competitionId,
  });

  console.log('Submissions list query key:', ['judge-submissions', competitionId]);

  const isLoading = isLoadingCompetition || isLoadingSubmissions;
  const error = competitionError || submissionsError;

  // Sort submissions: unscored first, then scored
  const sortedSubmissions = submissions
    ? [...submissions].sort((a: SubmissionWithScore, b: SubmissionWithScore) => {
        const aScored = a.is_scored || false;
        const bScored = b.is_scored || false;
        if (aScored === bScored) return 0;
        return aScored ? 1 : -1;
      })
    : [];

  // Calculate scored count
  const scoredCount =
    submissions?.filter((s: SubmissionWithScore) => s.is_scored).length || 0;
  const totalCount = submissions?.length || 0;

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
            <p className="font-semibold">Failed to load submissions</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/judge/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if competition is in JUDGING or COMPLETE status
  if (competition && competition.status !== 'judging' && competition.status !== 'complete') {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/judge/dashboard')}
            className="mb-6 flex items-center text-purple-600 hover:text-purple-800 font-medium"
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
            Back to Judge Dashboard
          </button>

          <Alert variant="info">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-blue-500 mr-3 mt-0.5"
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
                <p className="font-semibold text-blue-900">Judging Has Not Started</p>
                <p className="text-sm mt-1 text-blue-800">
                  The competition "{competition.title}" is currently in <span className="font-semibold capitalize">{competition.status}</span> status.
                  The competition organizer will notify you when judging begins.
                </p>
              </div>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push('/judge/dashboard')}
          className="mb-6 flex items-center text-purple-600 hover:text-purple-800 font-medium"
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
          Back to Judge Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              {competition?.title || 'Competition'}
            </h1>
            {competition?.domain && (
              <div className="flex flex-wrap gap-2">
                {competition.domain.split(',').map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800 border border-brand-200"
                  >
                    {d.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-lg text-gray-600">Review Submissions</p>
          <div className="mt-4">
            <span className="text-sm font-medium text-gray-700">
              Progress: {scoredCount} of {totalCount} submissions scored
            </span>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-md">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{
                  width: `${totalCount > 0 ? (scoredCount / totalCount) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - Submissions List */}
          <div className="lg:col-span-2">
            {/* Empty State */}
            {totalCount === 0 && (
              <Card>
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <p className="mt-4 text-lg text-gray-600">
                    No submissions assigned yet
                  </p>
                </div>
              </Card>
            )}

            {/* Submissions List */}
            {totalCount > 0 && (
              <div className="space-y-4">
                {sortedSubmissions.map((submission: SubmissionWithScore) => {
                  const isScored = submission.is_scored || false;

                  return (
                    <Card
                      key={submission.id}
                      className="hover:shadow-lg transition-shadow min-h-[180px] flex flex-col"
                    >
                      <div className="flex flex-col md:flex-row md:justify-between gap-4 flex-1">
                        {/* Submission Info */}
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-start gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {submission.title}
                            </h3>
                            {/* Status Badge */}
                            {isScored ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0 whitespace-nowrap">
                                Scored
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0 whitespace-nowrap">
                                Not Scored
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {submission.description}
                          </p>

                          {/* Score Display */}
                          {isScored && submission.judge_score !== undefined && (
                            <div className="flex items-center font-semibold text-purple-600 mb-4">
                              <svg
                                className="h-4 w-4 mr-1.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                />
                              </svg>
                              Score: {submission.judge_score.toFixed(1)}/10
                            </div>
                          )}

                          {/* Metadata - pushed to bottom */}
                          <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
                            {/* Founder Username */}
                            <div className="flex items-center">
                              <span className="font-medium">Username:</span>
                              <span className="ml-1">{submission.founder_username || `User ${submission.user_id}`}</span>
                            </div>

                            {/* Submitted Date */}
                            {submission.submitted_at && (
                              <div className="flex items-center">
                                <span className="font-medium">Submission Date:</span>
                                <span className="ml-1">{new Date(submission.submitted_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex-shrink-0">
                          <Button
                            onClick={() =>
                              router.push(`/judge/submissions/${submission.id}`)
                            }
                            className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
                          >
                            {isScored ? 'View Score' : 'Review & Score'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Judging Criteria Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card title="Judging Criteria">
                {competition?.rubric && Object.keys(competition.rubric).length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                      Score each submission based on these criteria:
                    </p>
                    {Object.entries(competition.rubric).map(
                      ([criteria, details]) => (
                        <div
                          key={criteria}
                          className="p-3 bg-purple-50 rounded-lg border border-purple-100"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900 capitalize">
                              {criteria}
                            </span>
                            <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                              Weight: {(details as any).weight || 1.0}
                            </span>
                          </div>
                          {(details as any).description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {(details as any).description}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    No judging criteria available.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JudgeSubmissionsPage() {
  return (
    <ProtectedRoute requiredRole="judge">
      <JudgeSubmissionsContent />
    </ProtectedRoute>
  );
}
