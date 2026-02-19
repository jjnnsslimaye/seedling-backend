'use client';

/**
 * Judge Submission Review and Scoring page
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Loading, Alert, Input } from '@/components/ui';
import { getSubmissionForJudging, submitScore } from '@/lib/api/judging';
import { useAuth } from '@/hooks/useAuth';

interface CriteriaScores {
  [key: string]: number;
}

function SubmissionReviewContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const submissionId = Number(params.id);

  // State
  const [scores, setScores] = useState<CriteriaScores>({});
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch submission details
  const {
    data: submission,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['submission-for-judging', submissionId],
    queryFn: () => getSubmissionForJudging(submissionId),
    enabled: !!submissionId,
  });

  // Get competition data from submission
  const competition = submission?.competition;

  // Check if judge has already scored this submission
  const alreadyScored = submission?.is_scored || false;

  // Pre-fill scores when viewing already-scored submission
  useEffect(() => {
    // Wait for both submission and user to load
    if (!submission?.is_scored || !user?.id || !submission?.parsed_human_scores?.length) {
      return;
    }

    // Find this judge's scores
    const myScore = submission.parsed_human_scores.find(
      (score: any) => score.judge_id === user.id
    );

    if (myScore) {
      if (myScore.criteria_scores) {
        setScores(myScore.criteria_scores);
      }

      if (myScore.feedback) {
        setFeedback(myScore.feedback);
      }
    }
  }, [submission?.is_scored, submission?.parsed_human_scores, user?.id]);

  // Initialize scores to 0 if not already scored
  useEffect(() => {
    if (submission?.rubric && Object.keys(scores).length === 0 && !submission?.is_scored) {
      const initialScores: CriteriaScores = {};

      Object.keys(submission.rubric).forEach((criteria) => {
        initialScores[criteria] = 0;
      });

      setScores(initialScores);
    }
  }, [submission, scores]);

  // Submit score mutation
  const submitScoreMutation = useMutation({
    mutationFn: (data: { criteria_scores: CriteriaScores; feedback?: string }) =>
      submitScore(submissionId, data),
    onSuccess: async () => {
      const competitionId = submission?.competition_id;

      // Force immediate refetch with EXACT matching keys
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['judge-assignments']
        }),
        queryClient.refetchQueries({
          queryKey: ['judge-submissions', competitionId]
        }),
        queryClient.refetchQueries({
          queryKey: ['submission-for-judging', submissionId]
        }),
      ]);

      // Show success message
      setSuccessMessage('Score submitted successfully!');

      // Auto-hide after 2 seconds and redirect
      setTimeout(() => {
        setSuccessMessage('');
        router.push(`/judge/competitions/${competitionId}/submissions`);
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Error submitting score:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit score';
      setErrors({
        submit: errorMessage,
      });
    },
  });

  // Handle score change
  const handleScoreChange = (criteria: string, value: string) => {
    const numValue = parseFloat(value);

    // Validate score (0-10)
    if (isNaN(numValue) || numValue < 0 || numValue > 10) {
      setErrors((prev) => ({
        ...prev,
        [criteria]: 'Score must be between 0 and 10',
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[criteria];
        return newErrors;
      });
    }

    setScores((prev) => ({
      ...prev,
      [criteria]: numValue,
    }));
  };

  // Calculate weighted average
  const calculateWeightedAverage = () => {
    if (!submission?.rubric) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    Object.entries(submission.rubric).forEach(([criteria, details]) => {
      const weight = (details as any).weight || 1.0;
      const score = scores[criteria] || 0;
      totalWeightedScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check all scores are valid
    Object.entries(scores).forEach(([criteria, score]) => {
      if (isNaN(score) || score < 0 || score > 10) {
        newErrors[criteria] = 'Score must be between 0 and 10';
      }
    });

    // Check feedback is not empty
    if (!feedback || feedback.trim().length === 0) {
      newErrors.feedback = 'Feedback is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    submitScoreMutation.mutate({
      criteria_scores: scores,
      feedback: feedback.trim() || undefined,
    });
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
  if (error || !submission) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error">
            <p className="font-semibold">Failed to load submission</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'Submission not found'}
            </p>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/judge/dashboard')}>Back to Judge Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const averageScore = calculateWeightedAverage();
  const isFormValid = Object.keys(errors).length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => {
            if (submission.competition_id) {
              router.push(
                `/judge/competitions/${submission.competition_id}/submissions`
              );
            } else {
              router.push('/judge/dashboard');
            }
          }}
          className="mb-6 flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200"
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
          Back to Submissions
        </button>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="mb-6">
            <Alert variant="error">{errors.submit}</Alert>
          </div>
        )}

        {/* Already Scored Alert */}
        {alreadyScored && (
          <div className="mb-6">
            <Alert variant="info">
              You have already scored this submission. Your previous score is
              displayed below.
            </Alert>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {submission.title}
          </h1>

          {/* Competition & Founder Info - Subtle metadata at bottom */}
          <div className="flex items-center gap-4 text-xs text-gray-400 pt-4 mt-4 border-t border-gray-200">
            {competition && (
              <div className="flex items-center">
                <span className="font-medium">Competition:</span>
                <span className="ml-1">{competition.title}</span>
              </div>
            )}

            <div className="flex items-center">
              <span className="font-medium">Founder:</span>
              <span className="ml-1">{submission.founder_username || `User ${submission.user_id}`}</span>
            </div>

            {submission.submitted_at && (
              <div className="flex items-center">
                <span className="font-medium">Submitted:</span>
                <span className="ml-1">{new Date(submission.submitted_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description and Video Vertical Layout */}
        <div className="space-y-6 mb-8">
          {/* Description */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            </div>
            <div className="p-6 h-[400px] overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-line">
                {submission.description}
              </p>
            </div>
          </div>

          {/* Video Player */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Submission Video</h2>
            </div>
            <div className="p-6">
              {submission.video_url ? (
                <video
                  controls
                  className="w-full rounded-2xl"
                  style={{ maxHeight: '400px' }}
                  src={submission.video_url}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-2xl">
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-4 text-gray-600">No video available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Judging Criteria Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Judging Criteria</h2>
              <p className="text-sm text-gray-600 mt-1">
                Evaluate each criterion based on the submission above
              </p>
              {/* Score Range Guide */}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="font-medium">Score Guide:</span>
                <span>0-3: Poor</span>
                <span>•</span>
                <span>4-5: Fair</span>
                <span>•</span>
                <span>6-7: Good</span>
                <span>•</span>
                <span>8-9: Excellent</span>
                <span>•</span>
                <span>10: Outstanding</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {submission?.rubric &&
                Object.entries(submission.rubric).map(
                  ([criteria, details]) => {
                    const weight = (details as any).weight || 1.0;
                    const description = (details as any).description || '';
                    const currentScore = scores[criteria] || 0;

                    return (
                      <div
                        key={criteria}
                        className="border border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-card-hover transition-shadow border-l-4 border-l-purple-500"
                      >
                        {/* Criterion Header */}
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 capitalize">
                            {criteria}
                          </h3>
                          <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                            {(weight * 100).toFixed(0)}%
                          </span>
                        </div>

                        {/* Criterion Description */}
                        {description && (
                          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            {description}
                          </p>
                        )}

                        {/* Score Slider */}
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={currentScore}
                            onChange={(e) =>
                              handleScoreChange(criteria, e.target.value)
                            }
                            disabled={alreadyScored}
                            className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={currentScore}
                              onChange={(e) =>
                                handleScoreChange(criteria, e.target.value)
                              }
                              disabled={alreadyScored}
                              className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            <span className="text-xl font-bold text-purple-600 w-12 text-center">
                              /10
                            </span>
                          </div>
                        </div>

                        {/* Error Message */}
                        {errors[criteria] && (
                          <p className="text-sm text-red-600 mt-2">
                            {errors[criteria]}
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
            </div>
          </div>
        </div>

        {/* Overall Feedback Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Overall Feedback</h2>
              <p className="text-sm text-gray-600 mt-1">
                Provide constructive feedback for the founder
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts on this submission. What did they do well? What could be improved?"
                rows={6}
                disabled={alreadyScored}
                readOnly={alreadyScored}
                className="block w-full px-4 py-3 border border-gray-300 rounded-2xl shadow-sm focus:outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {errors.feedback && (
                <p className="text-sm text-red-600 mt-2">{errors.feedback}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="flex items-center justify-between">
            {/* Weighted Average Display */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Weighted Average Score
              </p>
              <p className="text-5xl font-bold text-purple-600">
                {averageScore.toFixed(1)}
                <span className="text-3xl text-gray-400">/10</span>
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={
                alreadyScored ||
                !isFormValid ||
                !feedback?.trim() ||
                submitScoreMutation.isPending ||
                !!successMessage
              }
              className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 px-12 py-4 text-lg font-semibold"
            >
              {alreadyScored
                ? 'Already Scored'
                : submitScoreMutation.isPending
                  ? 'Submitting...'
                  : successMessage
                    ? 'Score Submitted!'
                    : 'Submit Score'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubmissionReviewPage() {
  return (
    <ProtectedRoute requiredRole="judge">
      <SubmissionReviewContent />
    </ProtectedRoute>
  );
}
