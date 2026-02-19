'use client';

/**
 * Submission Results & Feedback Page
 * Shows detailed scoring, judge feedback, and placement for founders
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth';
import { Loading, Alert, Button } from '@/components/ui';
import { getSubmission, type DetailedSubmission } from '@/lib/api/submissions';

function SubmissionResultsContent() {
  const params = useParams();
  const router = useRouter();
  const submissionId = Number(params.id);
  const [expandedJudges, setExpandedJudges] = useState<Set<number>>(new Set());
  const [paymentInstructionsExpanded, setPaymentInstructionsExpanded] = useState(false);

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

  // Helper: Get medal emoji for placement
  const getMedalEmoji = (place: string): string => {
    const medals: Record<string, string> = {
      'first': '🥇',
      'second': '🥈',
      'third': '🥉',
    };
    return medals[place] || '🏅';
  };

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
    return labels[place] || place;
  };

  // Helper: Calculate prize amount
  const getPrizeAmount = (): number => {
    if (!submission?.placement || !submission.competition?.prize_pool || !submission.competition?.prize_structure) {
      return 0;
    }
    const percentage = submission.competition.prize_structure[submission.placement];
    if (!percentage) return 0;
    return parseFloat(String(submission.competition.prize_pool)) * percentage;
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
          <p className="font-semibold">Failed to load results</p>
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

  // Debug: Log submission data to see structure
  console.log('Submission data:', submission);
  console.log('Judge feedback:', submission.judge_feedback);
  console.log('Human scores:', submission.human_scores);
  console.log('AI scores:', submission.ai_scores);

  const prizeAmount = getPrizeAmount();

  // Extract judge scores from human_scores.judges array
  const judgeScores = submission.human_scores?.judges || [];
  const hasJudgeScores = judgeScores.length > 0;
  const humanAverage = submission.human_scores?.average || 0;

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/submissions/${submissionId}`)}
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
          Back to Submission
        </button>

        {/* Header */}
        <div className="mb-8">
          {submission.placement ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{getMedalEmoji(submission.placement)}</span>
                <h1 className="text-3xl font-bold text-brand-600">
                  {getPlaceText(submission.placement)} Place Winner!
                </h1>
              </div>
              {prizeAmount > 0 && (
                <>
                  <p className="text-2xl font-bold text-slate-900 mb-3">
                    You've won ${prizeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in funding!
                  </p>

                  {/* Payment Instructions Collapsible */}
                  <div className="mt-2">
                    <button
                      onClick={() => setPaymentInstructionsExpanded(!paymentInstructionsExpanded)}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <span className="font-medium">Payment Instructions</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${paymentInstructionsExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {paymentInstructionsExpanded && (
                      <div className="mt-2 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                        <p className="text-sm text-blue-800">
                          Visit the Payouts page to set up your payment information and track the status of your prize distribution. Payouts are made promptly after the competition closes!
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Your Results
              </h1>
              <p className="text-lg text-slate-600">
                {submission.competition?.title}
              </p>
            </>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* First Row: Final Score Card (left) and Competition Summary (right) */}
          {/* Final Score Card */}
          <div className={`bg-white rounded-2xl shadow-card p-8 flex flex-col lg:col-span-2 ${submission.placement ? 'border-2 border-brand-500' : 'border border-slate-200'}`}>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Final Score
            </h2>

            {submission.final_score ? (
              <div className="text-center flex-1 flex flex-col justify-center">
                {/* Score section with circular progress */}
                <div className="flex flex-col items-center">
                  {/* Circular Progress Indicator */}
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="transform -rotate-90" width="200" height="200">
                      {/* Background circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r="85"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-slate-200"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r="85"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        className="text-brand-600"
                        style={{
                          strokeDasharray: `${2 * Math.PI * 85}`,
                          strokeDashoffset: `${2 * Math.PI * 85 * (1 - parseFloat(String(submission.final_score)) / 10)}`,
                          transition: 'stroke-dashoffset 1s ease-in-out'
                        }}
                      />
                    </svg>
                    {/* Score text in center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-5xl font-bold text-brand-600">
                        {parseFloat(String(submission.final_score)).toFixed(1)}
                      </div>
                      <div className="text-lg text-slate-600">out of 10</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center flex-1 flex items-center justify-center text-slate-500">
                Final score not yet available
              </div>
            )}
          </div>

          {/* Right Column - Competition Summary Sidebar */}
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
                    <p className="text-sm text-slate-600 mb-2">Domain</p>
                    <div className="flex flex-wrap gap-2">
                      {submission.competition?.domain?.split(',').map((domain: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800"
                        >
                          {domain.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  {submission.placement && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Your Placement</p>
                      <p className="text-2xl font-bold text-brand-600">
                        {getPlaceText(submission.placement)}
                      </p>
                    </div>
                  )}
                </div>

                {/* View Competition Results Button */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <Button
                    onClick={() => router.push(`/competitions/${submission.competition_id}/results`)}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold"
                  >
                    View Competition Results
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Subsequent Rows: Other cards spanning left column */}
          <div className="lg:col-span-2 space-y-6">

          {/* Rubric Breakdown by Criteria */}
          {hasJudgeScores && (() => {
            // Calculate average score for each criterion across all judges
            const criteriaAverages: Record<string, number> = {};
            const criterionCounts: Record<string, number> = {};

            judgeScores.forEach((judge: any) => {
              if (judge.criteria_scores) {
                Object.entries(judge.criteria_scores).forEach(([criterion, score]: [string, any]) => {
                  if (!criteriaAverages[criterion]) {
                    criteriaAverages[criterion] = 0;
                    criterionCounts[criterion] = 0;
                  }
                  criteriaAverages[criterion] += parseFloat(String(score));
                  criterionCounts[criterion]++;
                });
              }
            });

            // Calculate averages
            Object.keys(criteriaAverages).forEach(criterion => {
              criteriaAverages[criterion] = criteriaAverages[criterion] / criterionCounts[criterion];
            });

            return (
              <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Final Scores</h2>

                <div className="max-h-96 overflow-y-auto mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(criteriaAverages).map(([criterion, avgScore]: [string, number]) => (
                      <div key={criterion} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-sm font-medium text-slate-600 capitalize mb-2">
                          {criterion.replace(/_/g, ' ')}
                        </div>
                        <div className="text-3xl font-bold text-slate-900">
                          {avgScore.toFixed(1)}
                          <span className="text-lg text-slate-600 font-normal">/10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall */}
                {submission.final_score && (
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-slate-900">Overall</span>
                      <span className="text-3xl font-bold text-brand-600">
                        {parseFloat(String(submission.final_score)).toFixed(1)}
                        <span className="text-lg text-slate-600 font-normal">/10</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Individual Judge Scores and Feedback */}
          {hasJudgeScores && (
            <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Judge Feedback</h2>

              <div className="max-h-[800px] overflow-y-auto space-y-6">
                {judgeScores.map((judge: any, index: number) => {
                  const isExpanded = expandedJudges.has(index);
                  const toggleExpanded = () => {
                    const newExpanded = new Set(expandedJudges);
                    if (isExpanded) {
                      newExpanded.delete(index);
                    } else {
                      newExpanded.add(index);
                    }
                    setExpandedJudges(newExpanded);
                  };

                  return (
                    <div key={judge.judge_id || index} className="border border-slate-200 rounded-2xl bg-slate-50">
                      <button
                        onClick={toggleExpanded}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-100 transition-colors rounded-2xl"
                      >
                        <h3 className="text-lg font-semibold text-slate-900">
                          {judge.judge_name || `Judge ${index + 1}`}
                        </h3>
                        <div className="flex items-center gap-3">
                          {judge.overall && (
                            <span className="text-xl font-bold text-brand-600">
                              {parseFloat(String(judge.overall)).toFixed(1)}/10
                            </span>
                          )}
                          <svg
                            className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-6">
                          {/* Individual Criterion Scores */}
                          {judge.criteria_scores && Object.keys(judge.criteria_scores).length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-slate-700 mb-3">Scores:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(judge.criteria_scores).map(([criterion, score]: [string, any]) => (
                                  <div key={criterion} className="bg-white rounded-lg p-4 border border-slate-200">
                                    <div className="text-sm font-medium text-slate-600 capitalize mb-2">
                                      {criterion.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-3xl font-bold text-slate-900">
                                      {parseFloat(String(score)).toFixed(1)}
                                      <span className="text-lg text-slate-600 font-normal">/10</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Written Feedback */}
                          {judge.feedback && (
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                              <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                {judge.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results Available */}
          {!submission.final_score && !hasJudgeScores && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-8">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Results Not Yet Available</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Your submission is still being judged. Results and feedback will appear here once judging is complete.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubmissionResultsPage() {
  return (
    <ProtectedRoute requiredRole="founder">
      <SubmissionResultsContent />
    </ProtectedRoute>
  );
}
