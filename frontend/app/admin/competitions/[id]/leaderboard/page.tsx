'use client';

/**
 * Admin Competition Leaderboard page
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Loading, Alert } from '@/components/ui';
import { getCompetitionLeaderboard, selectWinners, getCompetitionSubmissions } from '@/lib/api/admin';

function LeaderboardContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const competitionId = Number(params.id);

  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [winnersSelected, setWinnersSelected] = useState(false);

  // Helper functions for dynamic winner selection
  const getMedalEmoji = (place: string): string => {
    const medals: Record<string, string> = {
      'first': '🥇',
      'second': '🥈',
      'third': '🥉',
      'fourth': '🏅',
      'fifth': '🏅',
    };
    return medals[place] || '🏅';
  };

  const getPlaceLabel = (place: string): string => {
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

  // Fetch leaderboard
  const {
    data: leaderboard,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competition-leaderboard', competitionId],
    queryFn: () => getCompetitionLeaderboard(competitionId),
    enabled: !!competitionId,
  });

  // Fetch submissions to check for winner status
  const {
    data: competitionSubmissions,
    isLoading: isLoadingSubmissions,
  } = useQuery({
    queryKey: ['competition-submissions', competitionId],
    queryFn: () => getCompetitionSubmissions(competitionId),
    enabled: !!competitionId,
  });

  // Select winners mutation
  const selectWinnersMutation = useMutation({
    mutationFn: () => {
      const submissions = leaderboard?.entries || [];
      const places = Object.keys(leaderboard?.prize_structure || {});
      const numWinners = places.length;
      const topSubmissions = submissions.slice(0, numWinners);

      const winners = places.map((place: string, index: number) => ({
        submission_id: topSubmissions[index].submission_id,
        place: place as "first" | "second" | "third",
      }));

      return selectWinners(competitionId, winners);
    },
    onSuccess: () => {
      setWinnersSelected(true);
      setSuccessMessage('Winners selected successfully! Competition status updated to Complete.');
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competition-leaderboard', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competition-submissions', competitionId] });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error: any) => {
      alert(
        'Failed to select winners: ' +
          (error.response?.data?.detail || error.message)
      );
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !leaderboard) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error">
            <p className="font-semibold">Failed to load leaderboard</p>
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

  const submissions = leaderboard.entries || [];

  // Check if winners have already been selected by checking submission statuses
  const hasExistingWinners = competitionSubmissions?.some((sub: any) => sub.status === 'winner') || false;

  // Combined check: winners selected either via local state (optimistic) or from API data
  const isWinnersSelected = winnersSelected || hasExistingWinners;

  // Helper to get status badge
  const getStatusBadge = (entry: any) => {
    if (entry.judging_complete) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Complete
        </span>
      );
    } else if (entry.num_judges_completed > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          In Progress
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Not Started
        </span>
      );
    }
  };

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

        {/* Header with Competition Title */}
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-4xl font-bold text-gray-900">
            {leaderboard.competition_title}
          </h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800">
            {leaderboard.domain}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Prize Pool */}
          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Prize Pool</p>
              <p className="text-3xl font-bold text-green-600">
                ${Number(leaderboard.prize_pool).toLocaleString()}
              </p>
            </div>
          </Card>

          {/* Total Submissions */}
          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Total Submissions</p>
              <p className="text-3xl font-bold text-brand-600">
                {leaderboard.total_submissions}
              </p>
            </div>
          </Card>

          {/* Fully Judged Count */}
          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Fully Judged Count</p>
              <p className="text-3xl font-bold text-purple-600">
                {leaderboard.fully_judged_count}
              </p>
            </div>
          </Card>
        </div>

        {/* Prize Distribution */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prize Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboard.prize_structure?.first !== undefined && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">🥇</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">1st Place</p>
                    <p className="text-xs text-gray-600">
                      {(leaderboard.prize_structure.first * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-yellow-700">
                  ${((Number(leaderboard.prize_pool) * leaderboard.prize_structure.first)).toFixed(2)}
                </p>
              </div>
            )}

            {leaderboard.prize_structure?.second !== undefined && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">🥈</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">2nd Place</p>
                    <p className="text-xs text-gray-600">
                      {(leaderboard.prize_structure.second * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-700">
                  ${((Number(leaderboard.prize_pool) * leaderboard.prize_structure.second)).toFixed(2)}
                </p>
              </div>
            )}

            {leaderboard.prize_structure?.third !== undefined && (
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">🥉</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">3rd Place</p>
                    <p className="text-xs text-gray-600">
                      {(leaderboard.prize_structure.third * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-orange-700">
                  ${((Number(leaderboard.prize_pool) * leaderboard.prize_structure.third)).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Submissions Table */}
        <Card>
          <div className="overflow-x-auto">
            {submissions.length === 0 ? (
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No submissions yet
                </h3>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submission Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Final Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Human Avg
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Judge Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tie
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((entry: any) => (
                    <tr
                      key={entry.submission_id}
                      className={`${
                        entry.judging_complete
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50 hover:bg-gray-100 opacity-75'
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {(() => {
                            // Incomplete judging
                            if (!entry.judging_complete) {
                              return (
                                <span className="text-sm text-gray-400 italic">
                                  Pending
                                </span>
                              );
                            }

                            // Unscored but complete judging (shouldn't happen, but handle it)
                            if (entry.rank >= 999 || entry.final_score === null) {
                              return (
                                <span className="text-sm text-gray-400 italic">
                                  —
                                </span>
                              );
                            }

                            const places = Object.keys(leaderboard?.prize_structure || {});
                            const numWinners = places.length;
                            const place = places[entry.rank - 1];

                            if (entry.rank <= numWinners && place) {
                              return (
                                <span className="text-2xl">
                                  {getMedalEmoji(place)}
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-sm font-medium text-gray-900">
                                  #{entry.rank}
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.username}
                        </div>
                      </td>

                      {/* Submission Title */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.title}
                        </div>
                      </td>

                      {/* Final Score */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!entry.judging_complete ? (
                          <span className="text-sm text-gray-400 italic">Incomplete</span>
                        ) : entry.final_score !== null && entry.final_score !== undefined ? (
                          <div className="text-sm font-bold text-brand-600">
                            {Number(entry.final_score).toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Human Scores Average */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {!entry.judging_complete ? (
                            <span className="text-gray-400 italic">—</span>
                          ) : entry.human_scores_average !== null ? (
                            entry.human_scores_average.toFixed(2)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Judge Progress */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {entry.num_judges_completed}/{entry.num_judges_assigned} judges
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(entry)}
                      </td>

                      {/* Tie Indicator */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {entry.has_tie && (
                          <span className="inline-flex items-center" title="Tied score">
                            <svg
                              className="h-5 w-5 text-orange-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Winner Selection Section */}
        {leaderboard.fully_judged_count === leaderboard.eligible_submissions ? (
          <Card className="mt-8 border-2 border-green-500 bg-green-50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-green-900">
                    {isWinnersSelected
                      ? 'Winners Selected'
                      : 'All Judging Complete - Ready to Select Winners'}
                  </h3>
                  {!isWinnersSelected && (
                    <p className="text-sm text-green-700 mt-1">
                      Winners will be selected based on final scores.
                    </p>
                  )}
                </div>
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {/* Winner Preview */}
              <div className="bg-white rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {isWinnersSelected ? 'Selected Winners:' : 'Winners to be confirmed:'}
                </h4>
                {(() => {
                  const places = Object.keys(leaderboard?.prize_structure || {});
                  const numWinners = places.length;
                  return submissions.slice(0, numWinners).map((entry: any, index: number) => {
                    const place = places[index];
                    return (
                      <div
                        key={entry.submission_id}
                        className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">
                            {getMedalEmoji(place)}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {getPlaceLabel(place)} Place: {entry.username}
                            </p>
                            <p className="text-xs text-gray-600">{entry.title}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-brand-600">
                          Score: {Number(entry.final_score).toFixed(1)}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Confirm Button */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={selectWinnersMutation.isPending || isWinnersSelected}
                  className={
                    isWinnersSelected
                      ? 'bg-green-700 text-white text-lg py-3 px-8 font-semibold cursor-not-allowed opacity-75'
                      : 'bg-green-600 hover:bg-green-700 text-white text-lg py-3 px-8 font-semibold'
                  }
                >
                  {isWinnersSelected ? (
                    <>
                      Winners Selected{' '}
                      <svg
                        className="w-5 h-5 ml-2 inline"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  ) : selectWinnersMutation.isPending ? (
                    'Confirming Winners...'
                  ) : (
                    'Confirm Winners'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mt-8 border-2 border-yellow-500 bg-yellow-50">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0"
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
                <h3 className="text-lg font-semibold text-yellow-900">
                  Waiting for All Judges to Complete Scoring
                </h3>
                <p className="text-sm text-yellow-800 mt-1">
                  {leaderboard.fully_judged_count} of {leaderboard.eligible_submissions} eligible submissions fully judged.
                  Winners can be selected once all eligible submissions have been scored by all assigned judges.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Winner Selection
              </h3>
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  You are about to select the following winners:
                </p>
                <div className="space-y-3 bg-slate-50 rounded-lg p-4 mb-4">
                  {(() => {
                    const places = Object.keys(leaderboard?.prize_structure || {});
                    const numWinners = places.length;
                    return submissions.slice(0, numWinners).map((entry: any, index: number) => {
                      const place = places[index];
                      return (
                        <div key={entry.submission_id} className="flex items-center gap-3">
                          <span className="text-2xl">
                            {getMedalEmoji(place)}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {getPlaceLabel(place)} Place: {entry.username}
                            </p>
                            <p className="text-xs text-gray-600">{entry.title}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <p className="text-sm font-semibold text-red-600">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowConfirmModal(false)}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    selectWinnersMutation.mutate();
                    setShowConfirmModal(false);
                  }}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Confirm Winners
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <LeaderboardContent />
    </ProtectedRoute>
  );
}
