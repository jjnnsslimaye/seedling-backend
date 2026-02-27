'use client';

/**
 * Competition detail page - Professional, information-rich layout
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getCompetition } from '@/lib/api/competitions';
import { getMySubmissions } from '@/lib/api/submissions';
import { Loading, Alert } from '@/components/ui';

export default function CompetitionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { isAuthenticated, isRole, user } = useAuth();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
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

  // Fetch competition
  const {
    data: competition,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competition', id],
    queryFn: () => getCompetition(Number(id)),
    enabled: !!id,
  });

  // Fetch user's submissions for this competition (only if authenticated and founder)
  const {
    data: userSubmissions,
    isLoading: isLoadingSubmissions
  } = useQuery({
    queryKey: ['user-submissions', id, user?.id],
    queryFn: () => getMySubmissions(Number(id)),
    enabled: !!id && !!user && isAuthenticated && isRole('founder'),
  });

  // Check if user has ANY submission for this competition
  const existingSubmission = userSubmissions && userSubmissions.length > 0
    ? userSubmissions[0]
    : null;

  // Get submission status
  const submissionStatus = existingSubmission?.status?.toLowerCase();
  const isDraft = submissionStatus === 'draft';
  const isPendingPayment = submissionStatus === 'pending_payment';
  const isSubmitted = submissionStatus === 'submitted';

  // Determine if submission needs payment (draft or pending_payment)
  const needsPayment = isDraft || isPendingPayment;

  // Check payment status with Stripe
  const checkPaymentStatus = async (submissionId: number) => {
    setIsCheckingPayment(true);
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
      setIsCheckingPayment(false);
    }
  };

  // Close payment status modal
  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, type: 'success', message: '', shouldRefresh: false });
    if (paymentModal.shouldRefresh) {
      window.location.reload();
    }
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
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error">
            <p className="font-semibold">Failed to load competition</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </Alert>
        </div>
      </div>
    );
  }

  // No competition found
  if (!competition) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Competition not found
          </h1>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('Competition data:', competition);
  console.log('Image URL:', competition?.image_url);

  // Calculate metrics
  const daysLeft = Math.ceil((new Date(competition.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const fillPercentage = (competition.current_entries / competition.max_entries) * 100;
  const isFull = competition.current_entries >= competition.max_entries;
  const isActive = competition.status === 'active';

  // Calculate prize breakdown
  const prizeBreakdown = Object.entries(competition.prize_structure || {}).map(
    ([placement, percentage]) => ({
      placement,
      percentage: percentage * 100,
      amount: competition.prize_pool * percentage,
    })
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status styling
  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      upcoming: 'bg-blue-100 text-blue-700',
      closed: 'bg-red-100 text-red-700',
      judging: 'bg-yellow-100 text-yellow-700',
      complete: 'bg-slate-100 text-slate-700',
    };
    return styles[status.toLowerCase()] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header - Clean banner with image background */}
      <div className="relative bg-white border-b border-slate-200 overflow-hidden min-h-[400px]">

        {/* Background Image or Gradient Fallback */}
        {competition.image_url ? (
          <>
            {/* Image Background */}
            <div className="absolute inset-0 z-0">
              <img
                src={competition.image_url}
                alt=""
                className="w-full h-full object-cover opacity-40"
              />
            </div>
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/70 via-white/60 to-white/50" />
          </>
        ) : (
          /* Gradient Fallback with opacity */
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200 opacity-40">
              {/* Plant pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-8 left-8 text-9xl">🌱</div>
                <div className="absolute bottom-8 right-8 text-9xl">🌿</div>
              </div>
            </div>
            {/* Same gradient overlay as image version */}
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/70 via-white/60 to-white/50" />
          </div>
        )}

        {/* Content - Must be relative with z-index */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">

          {/* Back button */}
          <button
            onClick={() => router.push('/competitions')}
            className="text-brand-600 hover:text-brand-700 font-semibold mb-6 flex items-center gap-2 transition-colors duration-200"
          >
            &lt; Back to Competitions
          </button>

          <div className="grid lg:grid-cols-[1fr_350px] gap-12">

            {/* Left: Title card with backdrop */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-lg h-full">

              {/* Domain tags only - no status */}
              <div className="flex flex-wrap gap-2 mb-4">
                {competition.domain.split(',').map((domain, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold"
                  >
                    {domain.trim()}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl font-extrabold text-slate-900 mb-10">
                {competition.title}
              </h1>

              {/* Horizontal Timeline */}
              <div className="relative">
                {/* Horizontal connecting line */}
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200" />

                {/* Timeline nodes */}
                <div className="relative flex justify-between items-start">

                  {(() => {
                    const now = new Date();
                    const openDate = new Date(competition.open_date);
                    const closeDate = new Date(competition.deadline);
                    const judgingDate = new Date(closeDate);
                    judgingDate.setDate(judgingDate.getDate() + 1);

                    const isOpenPassed = now >= openDate;
                    const isClosePassed = now >= closeDate;
                    const isJudgingPassed = now >= judgingDate;

                    return (
                      <>
                        {/* Opens */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg mb-3 relative z-10 border-2 ${
                            isOpenPassed
                              ? 'bg-brand-500 border-brand-600'
                              : 'bg-white border-slate-300'
                          }`}>
                            {isOpenPassed ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">Opens</h3>
                          <span className="text-xs text-slate-600">
                            {new Date(competition.open_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Closes */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg mb-3 relative z-10 border-2 ${
                            isClosePassed
                              ? 'bg-brand-500 border-brand-600'
                              : 'bg-white border-slate-300'
                          }`}>
                            {isClosePassed ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">Closes</h3>
                          <span className="text-xs text-slate-600">
                            {new Date(competition.deadline).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Judging */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg mb-3 relative z-10 border-2 ${
                            isJudgingPassed
                              ? 'bg-brand-500 border-brand-600'
                              : 'bg-white border-slate-300'
                          }`}>
                            {isJudgingPassed ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">Judging</h3>
                          <span className="text-xs text-slate-600">
                            {judgingDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Winners */}
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg mb-3 relative z-10 border-2 bg-white border-slate-300">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">Winners</h3>
                          <span className="text-xs text-slate-600">TBA</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right: Entry fee card with backdrop */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-lg h-full">
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-600 mb-2">Entry Fee</div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {formatCurrency(competition.entry_fee)}
                </div>
                <div className="text-sm text-slate-500 mb-6">per submission</div>

                {/* Add padding-top to push divider down to align with timeline */}
                <div className="pt-6">
                  <div className="space-y-2 text-sm border-t border-slate-200 pt-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Spots Available</span>
                      <span className="font-bold text-slate-900">
                        {competition.max_entries - competition.current_entries}
                      </span>
                    </div>
                    {daysLeft > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Days Left</span>
                        <span className="font-bold text-red-600">{daysLeft}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-[1fr_350px] gap-12 w-full overflow-hidden items-start">

          {/* Left Column - Detailed Information */}
          <div className="space-y-8 min-w-0">

            {/* About Competition - Description & Judging Only */}
            <section className="bg-white rounded-2xl p-4 md:p-8 shadow-card h-fit">

              {/* Description */}
              <div className="mb-8 pb-8 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">About This Competition</h2>
                <div className="max-h-[300px] overflow-y-auto">
                  {competition.description.split('\n').map((line, index) => (
                    <p key={index} className="text-lg text-slate-700 leading-relaxed mb-2">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              {/* Judging Criteria */}
              <div className="mb-8 pb-8 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Judging Criteria</h2>
                <div className="max-h-[300px] overflow-y-auto">
                  {competition.rubric && typeof competition.rubric === 'object' && Object.keys(competition.rubric).length > 0 ? (
                    <table className="w-full">
                      <tbody>
                        {(() => {
                          const rubricEntries = Object.entries(competition.rubric);
                          const totalWeight = rubricEntries.reduce((sum, [_, details]: [string, any]) => {
                            const weight = typeof details === 'object' && details.weight ? details.weight : 0;
                            return sum + weight;
                          }, 0);

                          return rubricEntries.map(([criterion, details]: [string, any]) => {
                            const description = typeof details === 'string' ? details : details.description || '';
                            const weight = typeof details === 'object' && details.weight ? details.weight : 0;
                            const percentage = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(0) : '0';

                            return (
                              <tr key={criterion} className="border-b border-slate-100 last:border-0">
                                <td className="py-3 pr-4 font-semibold text-slate-900 align-top whitespace-nowrap capitalize">
                                  {criterion.replace(/_/g, ' ')}:
                                </td>
                                <td className="py-3 pr-4 text-slate-700 align-top">
                                  {description}
                                </td>
                                <td className="py-3 font-bold text-slate-900 text-right align-top whitespace-nowrap">
                                  {percentage}%
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-slate-700 leading-relaxed">
                      Submissions will be evaluated by industry experts based on innovation and originality,
                      market viability and business feasibility, and clarity and quality of presentation.
                    </p>
                  )}
                </div>
              </div>

              {/* Payouts */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Payouts</h2>
                <div className="max-h-[300px] overflow-y-auto">
                  {competition.prize_structure && typeof competition.prize_structure === 'object' && Object.keys(competition.prize_structure).length > 0 ? (
                    <table className="w-full">
                      <tbody>
                        {Object.entries(competition.prize_structure)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([place, percentage]: [string, any]) => {
                            // Calculate max prize pool
                            const maxPrizePool = competition.max_entries * competition.entry_fee * (1 - competition.platform_fee_percentage / 100);

                            // Convert percentage to proper format (assuming it's stored as decimal like 0.5 for 50%)
                            const pct = typeof percentage === 'string'
                              ? parseFloat(percentage.replace('%', ''))
                              : percentage * 100;

                            // Calculate dollar amount based on max prize pool
                            const dollarAmount = maxPrizePool * (percentage as number);

                            return (
                              <tr key={place} className="border-b border-slate-100 last:border-0">
                                <td className="py-3 text-slate-700 align-top capitalize">
                                  {place.replace(/_/g, ' ')}
                                </td>
                                <td className="py-3 font-bold text-slate-900 text-center align-top">
                                  {formatCurrency(dollarAmount)}
                                </td>
                                <td className="py-3 font-bold text-slate-900 text-right align-top whitespace-nowrap">
                                  {pct.toFixed(0)}%
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-slate-700 leading-relaxed">
                      Prize pool distributed to top-rated submissions based on final rankings.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Sticky Prize Pool Card */}
          <div className="lg:sticky lg:top-8 space-y-6 min-w-0 self-start">

            {/* Prize Pool Card - Emphasized */}
            <div className="bg-gradient-to-br from-brand-50 via-green-50 to-brand-100 rounded-2xl p-4 md:p-6 shadow-xl border-2 border-brand-200">
              <div className="text-center mb-6">
                <div className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">
                  Prize Pool
                </div>
                <div className="text-3xl font-bold text-brand-700 mb-1">
                  {formatCurrency(competition.prize_pool)}/{formatCurrency(competition.max_entries * competition.entry_fee * (1 - competition.platform_fee_percentage / 100))}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="h-3 bg-white rounded-full overflow-hidden mb-2 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">{competition.current_entries} entries</span>
                  <span className="text-brand-700">{fillPercentage.toFixed(0)}% funded</span>
                </div>
              </div>

              <div className="space-y-3 mb-6 pb-6 border-t border-brand-200 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Entry Fee</span>
                  <span className="font-bold text-slate-900">{formatCurrency(competition.entry_fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Platform Fee</span>
                  <span className="font-bold text-slate-900">{competition.platform_fee_percentage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">To Prize Pool</span>
                  <span className="font-bold text-brand-700">
                    {formatCurrency(competition.entry_fee * (100 - competition.platform_fee_percentage) / 100)}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <div>
                {!isAuthenticated ? (
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl text-lg transition-colors duration-200"
                  >
                    Login to Enter
                  </button>
                ) : competition.status === 'complete' ? (
                  <button
                    onClick={() => router.push(`/competitions/${competition.id}/results`)}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl text-lg transition-colors duration-200"
                  >
                    View Results & Leaderboard
                  </button>
                ) : !isRole('founder') ? (
                  <button
                    disabled
                    className="w-full bg-slate-300 text-slate-500 font-bold py-4 rounded-xl text-lg cursor-not-allowed"
                  >
                    Founders Only
                  </button>
                ) : competition.status !== 'active' ? (
                  <button
                    disabled
                    className="w-full bg-slate-300 text-slate-500 font-bold py-4 rounded-xl text-lg cursor-not-allowed"
                  >
                    Competition {competition.status}
                  </button>
                ) : isFull && !existingSubmission ? (
                  <button
                    disabled
                    className="w-full bg-slate-300 text-slate-500 font-bold py-4 rounded-xl text-lg cursor-not-allowed"
                  >
                    Competition Full
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        if (existingSubmission) {
                          if (isDraft) {
                            // Draft - go to payment page
                            router.push(`/competitions/${competition.id}/submit/payment?submission_id=${existingSubmission.id}`);
                          } else if (isPendingPayment) {
                            // Pending payment - CHECK payment status with Stripe
                            await checkPaymentStatus(existingSubmission.id);
                          } else if (isSubmitted) {
                            // Submitted - view submission details
                            router.push(`/submissions/${existingSubmission.id}`);
                          } else {
                            // Fallback - view submission
                            router.push(`/submissions/${existingSubmission.id}`);
                          }
                        } else {
                          // No submission - start new submission
                          router.push(`/competitions/${competition.id}/submit`);
                        }
                      }}
                      disabled={isCheckingPayment || isLoadingSubmissions}
                      className={`w-full font-bold py-4 rounded-xl text-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSubmitted
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-brand-600 hover:bg-brand-700 text-white'
                      }`}
                    >
                      {isCheckingPayment
                        ? 'Checking...'
                        : isLoadingSubmissions
                        ? 'Loading...'
                        : existingSubmission
                        ? isDraft
                          ? 'Complete Payment'
                          : isPendingPayment
                          ? 'Check Payment Status'
                          : isSubmitted
                          ? 'Submission Complete ✓'
                          : 'View Your Submission'
                        : 'Enter Competition'}
                    </button>
                    <p className="text-xs text-center text-slate-600 mt-4">
                      {isLoadingSubmissions ? (
                        'Checking your submissions...'
                      ) : existingSubmission ? (
                        isDraft ? (
                          'Complete your payment to finalize your submission'
                        ) : isPendingPayment ? (
                          'Check the status of your payment'
                        ) : isSubmitted ? (
                          'View details of your submitted entry'
                        ) : (
                          'View details of your submission'
                        )
                      ) : (
                        'Entry fees are non-refundable and fund the prize pool'
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
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
