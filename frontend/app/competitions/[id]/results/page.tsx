'use client';

/**
 * Public Competition Results Page
 * Shows winners podium and full leaderboard
 */

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Lock, Unlock } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth';
import { Loading, Alert, Button } from '@/components/ui';
import { getCompetitionResults, type CompetitionResults, type LeaderboardEntry } from '@/lib/api/competitions';
import { useAuth } from '@/hooks/useAuth';

function CompetitionResultsContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const competitionId = Number(params.id);

  // Fetch competition results
  const {
    data: results,
    isLoading,
    error,
  } = useQuery<CompetitionResults>({
    queryKey: ['competition-results', competitionId],
    queryFn: () => getCompetitionResults(competitionId),
    enabled: !!competitionId,
  });

  // Helper: Get medal emoji
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

  // Get winners from entries (those with rank 1-3 or in prize_structure)
  const getWinners = (): { place: string; entry: LeaderboardEntry; prizeAmount: number }[] => {
    if (!results) return [];

    const winners: { place: string; entry: LeaderboardEntry; prizeAmount: number }[] = [];
    const prizeStructure = results.prize_structure || {};
    const places = Object.keys(prizeStructure);

    // Get top N entries based on prize structure
    const topEntries = results.entries
      .filter((e: LeaderboardEntry) => e.final_score !== null)
      .slice(0, places.length);

    places.forEach((place, index) => {
      if (topEntries[index]) {
        const prizeAmount = parseFloat(String(results.prize_pool)) * prizeStructure[place];
        winners.push({
          place,
          entry: topEntries[index],
          prizeAmount,
        });
      }
    });

    return winners;
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
          <p className="font-semibold">Failed to load competition results</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'Results may not be available yet'}
          </p>
          <Button
            onClick={() => router.push(`/competitions/${competitionId}`)}
            className="mt-4 bg-white text-red-600 border border-red-600 hover:bg-red-50"
          >
            Back to Competition
          </Button>
        </Alert>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const winners = getWinners();
  const userEntry = results.entries.find((e: LeaderboardEntry) => e.user_id === user?.id);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/competitions/${competitionId}`)}
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            {results.competition_title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {results.domain?.split(',').map((domain: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800"
              >
                {domain.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Top Submissions */}
        {winners.length > 0 && (
          <div className="mb-16">
            <div className="bg-white rounded-3xl shadow-card p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-8">Top Submissions</h2>

              {/* First Place - Featured */}
              {winners[0] && (
                <div className={`bg-slate-50 border-t-2 border-r-2 border-b-2 border-slate-200 border-l-8 border-l-yellow-400 rounded-2xl p-8 transition-all hover:scale-[1.01] ${winners.length > 1 ? 'mb-8' : ''}`} style={{ boxShadow: '0 4px 20px rgba(34, 197, 94, 0.08)' }}>
                  <div className="flex items-start gap-6">
                    {/* Avatar */}
                    {winners[0].entry.avatar_url ? (
                      <img
                        src={winners[0].entry.avatar_url}
                        alt={winners[0].entry.username}
                        className="w-20 h-20 rounded-full object-cover flex-shrink-0 ring-4 ring-yellow-400"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ring-4 ring-yellow-400">
                        {winners[0].entry.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Badge and Prize */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-brand-500 text-white">
                          1st Place
                        </span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(winners[0].prizeAmount)}
                        </span>
                      </div>

                      {/* Submission Title */}
                      <h3 className="text-xl font-bold text-slate-900 mb-1">
                        {winners[0].entry.title}
                      </h3>

                      {/* Founder Name */}
                      <p className="text-sm text-slate-600 mb-3">
                        {winners[0].entry.username}
                      </p>

                      {/* Description */}
                      {winners[0].entry.description && (
                        <p className="text-slate-700 line-clamp-2">
                          {winners[0].entry.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Remaining Places - Grid */}
              {winners.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {winners.slice(1).map((winner, index) => {
                    const placement = index + 2;
                    const getPlacementSuffix = (num: number) => {
                      if (num === 2) return '2nd';
                      if (num === 3) return '3rd';
                      return `${num}th`;
                    };

                    const getLeftBorderColor = (num: number) => {
                      if (num === 2) return 'border-l-gray-400';
                      if (num === 3) return 'border-l-orange-400';
                      return 'border-l-slate-400';
                    };

                    const getAvatarRingColor = (num: number) => {
                      if (num === 2) return 'ring-gray-400';
                      if (num === 3) return 'ring-orange-400';
                      return 'ring-brand-400';
                    };

                    return (
                      <div
                        key={winner.entry.submission_id}
                        className={`bg-slate-50 border-t-2 border-r-2 border-b-2 border-slate-200 border-l-8 ${getLeftBorderColor(placement)} rounded-2xl p-6 transition-all hover:scale-[1.01]`}
                        style={{ boxShadow: '0 2px 12px rgba(34, 197, 94, 0.06)' }}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          {/* Avatar */}
                          {winner.entry.avatar_url ? (
                            <img
                              src={winner.entry.avatar_url}
                              alt={winner.entry.username}
                              className={`w-14 h-14 rounded-full object-cover flex-shrink-0 ring-3 ${getAvatarRingColor(placement)}`}
                            />
                          ) : (
                            <div className={`w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ring-3 ${getAvatarRingColor(placement)}`}>
                              {winner.entry.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          {/* Placement Info */}
                          <div className="flex-1 min-w-0">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 mb-2">
                              {getPlacementSuffix(placement)} Place
                            </span>
                            <p className="text-lg font-bold bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(winner.prizeAmount)}
                            </p>
                          </div>
                        </div>

                        {/* Submission Title */}
                        <h4 className="text-base font-bold text-slate-900 mb-1 line-clamp-2">
                          {winner.entry.title}
                        </h4>

                        {/* Founder Name */}
                        <p className="text-sm text-slate-600">
                          {winner.entry.username}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-white">
            <h2 className="text-2xl font-bold text-slate-900">Full Leaderboard</h2>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Submission
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {results.entries.map((entry: LeaderboardEntry) => {
                  const isWinner = entry.rank <= winners.length && entry.final_score !== null;
                  const isUserEntry = entry.user_id === user?.id;
                  const winnerInfo = winners.find(w => w.entry.submission_id === entry.submission_id);

                  return (
                    <tr
                      key={entry.submission_id}
                      className={`${
                        isWinner ? 'bg-yellow-50' : entry.judging_complete ? 'bg-white' : 'bg-slate-50 opacity-75'
                      } ${isUserEntry ? 'ring-2 ring-inset ring-brand-500' : ''}`}
                    >
                      {/* User */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          {entry.avatar_url ? (
                            <img
                              src={entry.avatar_url}
                              alt={entry.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
                              {entry.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {/* Username */}
                          <span className="font-medium text-slate-900">
                            {entry.username}
                          </span>
                          {isUserEntry && (
                            <span className="text-xs text-brand-600 font-semibold">(You)</span>
                          )}
                        </div>
                      </td>

                      {/* Submission Title */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isUserEntry ? (
                            // User's own submission - no icon, not clickable
                            <span className="text-sm font-medium text-slate-900">
                              {entry.title}
                            </span>
                          ) : entry.is_public ? (
                            // Public submission - clickable with unlock icon
                            <>
                              <Link
                                href={`/submissions/${entry.submission_id}/public`}
                                className="text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline cursor-pointer"
                                title="Click to view this public submission"
                              >
                                {entry.title}
                              </Link>
                              <span title="Public submission - click title to view">
                                <Unlock className="h-4 w-4 text-green-600 flex-shrink-0" />
                              </span>
                            </>
                          ) : (
                            // Private submission - not clickable with lock icon
                            <>
                              <span className="text-sm font-medium text-slate-900">
                                {entry.title}
                              </span>
                              <span title="This founder chose to keep their submission private">
                                <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {!entry.judging_complete ? (
                          <span className="text-sm text-slate-400 italic">Incomplete</span>
                        ) : entry.final_score !== null ? (
                          <span className="text-lg font-semibold text-slate-900">
                            {parseFloat(String(entry.final_score)).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>

                      {/* Rank */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!entry.judging_complete ? (
                          <span className="text-sm text-slate-400 italic">Pending</span>
                        ) : entry.final_score === null ? (
                          <span className="text-sm text-slate-400 italic">-</span>
                        ) : isWinner && winnerInfo ? (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getMedalEmoji(winnerInfo.place)}</span>
                            <span className="text-lg font-semibold text-slate-900">
                              {entry.rank}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-900">
                            #{entry.rank}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompetitionResultsPage() {
  return (
    <ProtectedRoute>
      <CompetitionResultsContent />
    </ProtectedRoute>
  );
}
