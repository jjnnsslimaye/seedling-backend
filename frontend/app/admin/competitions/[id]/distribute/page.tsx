'use client';

/**
 * Admin Prize Distribution page
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Loading, Alert, Button } from '@/components/ui';
import { getCompetition } from '@/lib/api/competitions';
import { getCompetitionSubmissions, getAllUsers, getCompetitionPayments, distributePrizes } from '@/lib/api/admin';

function DistributePrizesContent() {
  // ===== ALL HOOKS FIRST =====
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const competitionId = Number(params.id);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  // Fetch submissions to get winners
  const {
    data: submissions,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
  } = useQuery({
    queryKey: ['competition-submissions', competitionId],
    queryFn: () => getCompetitionSubmissions(competitionId),
    enabled: !!competitionId,
  });

  // Fetch users to get Stripe Connect status
  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => getAllUsers(),
    enabled: !!competitionId,
  });

  // Fetch payment history
  const {
    data: payments,
    isLoading: isLoadingPayments,
  } = useQuery({
    queryKey: ['competition-payments', competitionId],
    queryFn: () => getCompetitionPayments(competitionId),
    enabled: !!competitionId,
  });

  // Distribute prizes mutation
  const distributePrizesMutation = useMutation({
    mutationFn: () => distributePrizes(competitionId),
    onSuccess: () => {
      setShowConfirmModal(false);
      queryClient.invalidateQueries({ queryKey: ['competition-payments', competitionId] });
    },
  });

  // ===== DERIVED STATE & CALCULATIONS =====
  const isLoading = isLoadingCompetition || isLoadingSubmissions || isLoadingUsers;
  const error = competitionError || submissionsError || usersError;

  // ===== EARLY RETURNS FOR LOADING/ERROR STATES =====
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
        </div>
      </div>
    );
  }

  // ===== RENDER LOGIC =====
  // Get winners from submissions (those with status='winner')
  const winners = (submissions || [])
    .filter((s: any) => s.status === 'winner')
    .sort((a: any, b: any) => {
      const order: { [key: string]: number } = { first: 1, second: 2, third: 3 };
      return (order[a.placement] || 999) - (order[b.placement] || 999);
    });

  // Helper to get user data for a submission
  const getUserForSubmission = (submission: any) => {
    if (!submission || !users) return null;
    return users.find((u: any) => u.id === submission.user_id);
  };

  // Helper to calculate prize amount
  // prize_structure stores decimal values (e.g., 0.6 for 60%, not 60)
  const getPrizeAmount = (placement: string) => {
    const prizeStructure = competition.prize_structure || {};
    const percentage = prizeStructure[placement] || 0;
    return competition.prize_pool * percentage;
  };

  // Helper to get place display text
  const getPlaceText = (placement: string) => {
    switch (placement) {
      case 'first':
        return '1st';
      case 'second':
        return '2nd';
      case 'third':
        return '3rd';
      case 'fourth':
        return '4th';
      case 'fifth':
        return '5th';
      case 'sixth':
        return '6th';
      case 'seventh':
        return '7th';
      case 'eighth':
        return '8th';
      case 'ninth':
        return '9th';
      case 'tenth':
        return '10th';
      default:
        return placement;
    }
  };

  // Helper to get place display text with emoji
  const getPlaceWithEmoji = (placement: string) => {
    const medals: Record<string, string> = {
      'first': '🥇',
      'second': '🥈',
      'third': '🥉',
    };
    const medal = medals[placement] || '';
    return `${medal} ${getPlaceText(placement)}`.trim();
  };

  // Helper to format date
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Calculate payment readiness
  const winnersWithUsers = winners.map((winner: any) => ({
    ...winner,
    user: getUserForSubmission(winner),
    prizeAmount: getPrizeAmount(winner.placement),
    placeText: getPlaceText(winner.placement),
  }));

  const readyWinners = winnersWithUsers.filter((w: any) => w.user?.connect_payouts_enabled === true);
  const totalPrizeAmount = readyWinners.reduce((sum: number, w: any) => sum + w.prizeAmount, 0);
  const allWinnersReady = winnersWithUsers.length > 0 && winnersWithUsers.every((w: any) => w.user?.connect_payouts_enabled === true);

  // Check if all prizes have already been distributed
  const allPaymentsCompleted = payments && payments.length > 0 &&
    payments.length >= winnersWithUsers.length &&
    payments.every((p: any) => p.status === 'completed' || p.status === 'COMPLETED');

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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Distribute Prizes - {competition.title}
          </h1>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Competition Financial Summary
          </h2>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Entry Fee:</span>
              <span className="font-semibold text-gray-900">
                ${competition.entry_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Entries:</span>
              <span className="font-semibold text-gray-900">
                {competition.current_entries}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue:</span>
              <span className="font-semibold text-gray-900">
                ${(competition.entry_fee * competition.current_entries).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee:</span>
              <span className="font-semibold text-gray-900">
                {competition.platform_fee_percentage}% (${((competition.entry_fee * competition.current_entries) * (competition.platform_fee_percentage / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
            <div className="flex justify-between col-span-2 pt-3 border-t border-gray-200">
              <span className="text-gray-600">Prize Pool:</span>
              <span className="font-bold text-gray-900">
                ${competition.prize_pool.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="col-span-2 pt-3 border-t border-gray-200">
              <div className="font-semibold text-gray-900 mb-2">Prize Structure:</div>
              <div className="space-y-1 pl-4">
                {Object.entries(competition.prize_structure || {}).map(([place, percentage]) => {
                  const amount = parseFloat(competition.prize_pool as any) * (percentage as number);
                  return (
                    <div key={place} className="flex justify-between text-xs">
                      <span className="text-gray-600">{getPlaceWithEmoji(place)}:</span>
                      <span className="font-semibold text-gray-900">
                        {((percentage as number) * 100).toFixed(0)}% (${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Winners Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto mb-8">
          <table className="min-w-full divide-y divide-gray-200 table-auto">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Place
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Onboarding
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charges
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payouts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Setup Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {winners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No winners selected yet
                  </td>
                </tr>
              ) : (
                winners.map((winner: any) => {
                  const user = getUserForSubmission(winner);
                  const placeText = getPlaceText(winner.placement);

                  return (
                    <tr key={winner.id} className="hover:bg-slate-50">
                      {/* Place */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {placeText}
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user?.username || 'Unknown'}
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {winner.title}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {winner.final_score ? Number(winner.final_score).toFixed(2) : 'N/A'}
                        </div>
                      </td>

                      {/* Onboarding */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-xl">
                          {user?.connect_onboarding_complete ? '✅' : '❌'}
                        </span>
                      </td>

                      {/* Charges */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-xl">
                          {user?.connect_charges_enabled ? '✅' : '❌'}
                        </span>
                      </td>

                      {/* Payouts */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-xl">
                          {user?.connect_payouts_enabled ? '✅' : '❌'}
                        </span>
                      </td>

                      {/* Setup Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatDate(user?.connect_onboarded_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              Payment History
            </h2>
          </div>

          {isLoadingPayments ? (
            <div className="px-6 py-8 text-center">
              <Loading size="sm" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No prize payments have been made yet.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stripe Transfer ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">
                        ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-600">
                        {payment.stripe_transfer_id || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatDate(payment.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payment Readiness & Distribute Button */}
        {winners.length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Readiness Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Payment Readiness Status
              </h3>

              <div className="space-y-3">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{readyWinners.length}</span> of <span className="font-semibold">{winnersWithUsers.length}</span> winners ready to receive payment
                </div>

                {allWinnersReady ? (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
                    <span className="text-xl">✅</span>
                    <span className="font-semibold">All winners can receive payment</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-4 py-3 rounded-lg">
                    <span className="text-xl">⚠️</span>
                    <span className="font-semibold">
                      {winnersWithUsers.length - readyWinners.length} winner(s) need to complete Stripe onboarding
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Distribute Prizes Button */}
            <div className="relative group">
              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={!allWinnersReady || allPaymentsCompleted || distributePrizesMutation.isPending}
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3"
              >
                {distributePrizesMutation.isPending
                  ? 'Distributing...'
                  : allPaymentsCompleted
                  ? 'Prizes Already Distributed ✓'
                  : 'Distribute Prizes'}
              </Button>

              {!allWinnersReady && !allPaymentsCompleted && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  All winners must have payouts enabled to distribute prizes
                </div>
              )}
              {allPaymentsCompleted && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  All prizes have been distributed
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Confirm Prize Distribution
              </h3>

              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-700">
                  You are about to distribute <span className="font-bold">${totalPrizeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> in prizes via Stripe.
                </p>

                <p className="text-sm text-red-600 font-semibold">
                  This action will initiate payouts that cannot be reversed.
                </p>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-2">
                    Winners who will be paid:
                  </div>
                  <ul className="space-y-2">
                    {readyWinners.map((winner: any) => (
                      <li key={winner.id} className="text-sm text-gray-700">
                        • {winner.user?.username}: ${winner.prizeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({winner.placeText} Place)
                      </li>
                    ))}
                  </ul>
                </div>

                {readyWinners.length < winnersWithUsers.length && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    <p className="text-sm text-yellow-700">
                      <span className="font-semibold">Note:</span> Only winners with completed Stripe accounts will be paid.
                    </p>
                  </div>
                )}
              </div>

              {distributePrizesMutation.isError && (
                <Alert variant="error" className="mb-4">
                  <p className="font-semibold">Failed to distribute prizes</p>
                  <p className="text-sm mt-1">
                    {distributePrizesMutation.error instanceof Error
                      ? distributePrizesMutation.error.message
                      : 'An error occurred'}
                  </p>
                </Alert>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={distributePrizesMutation.isPending}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => distributePrizesMutation.mutate()}
                  disabled={distributePrizesMutation.isPending}
                  className="bg-brand-600 hover:bg-brand-700 text-white"
                >
                  {distributePrizesMutation.isPending ? 'Processing...' : 'Confirm Distribution'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DistributePrizesPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <DistributePrizesContent />
    </ProtectedRoute>
  );
}
