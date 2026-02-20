'use client';

/**
 * Payouts Page
 * Shows Stripe Connect status and prize winnings for founders
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth';
import { Button, Alert } from '@/components/ui';
import { api } from '@/lib/api';

// Winning data from API
interface Winning {
  id: number;
  amount: number;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string | null;
  processed_at: string | null;
  competition: {
    id: number;
    title: string;
    domain: string;
    image_url?: string;
  } | null;
  submission: {
    id: number;
    title: string;
    placement: number;
  } | null;
}

function PayoutsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stripeError, setStripeError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch winnings
  const { data: winnings, isLoading: winningsLoading } = useQuery<Winning[]>({
    queryKey: ['my-winnings'],
    queryFn: async () => {
      const response = await api.get('/payments/my-winnings');
      return response.data;
    },
  });

  // Mutation for initial Stripe Connect setup
  const setupStripeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/users/me/connect-account');
      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      window.location.href = data.onboarding_url;
    },
    onError: (error: any) => {
      console.error('Failed to start Stripe onboarding:', error);
      setStripeError(error.response?.data?.detail || 'Failed to start Stripe setup');
    },
  });

  // Mutation for updating payment method (or completing setup)
  const updatePaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/users/me/connect-account/refresh-link');
      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe (shows existing info for updates)
      window.location.href = data.onboarding_url;
    },
    onError: (error: any) => {
      console.error('Failed to get Stripe link:', error);
      setStripeError(error.response?.data?.detail || 'Failed to get Stripe link');
    },
  });


  // Get placement emoji and text
  const getPlacementDisplay = (placement: number | undefined) => {
    if (!placement) return { emoji: '🏆', text: 'Winner' };

    const displays: Record<number, { emoji: string; text: string }> = {
      1: { emoji: '🥇', text: '1st Place' },
      2: { emoji: '🥈', text: '2nd Place' },
      3: { emoji: '🥉', text: '3rd Place' },
    };
    return displays[placement] || { emoji: '🏆', text: `${placement}th Place` };
  };

  // Get payment status display
  const getPaymentStatus = (status: string, hasStripeConnect: boolean) => {
    if (status === 'completed') {
      return {
        text: 'Paid',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✅',
      };
    }

    if (status === 'pending') {
      if (!hasStripeConnect) {
        return {
          text: 'Pending Setup',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '🟡',
        };
      }
      return {
        text: 'Processing',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '⏳',
      };
    }

    if (status === 'failed') {
      return {
        text: 'Failed',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '❌',
      };
    }

    return {
      text: 'Unknown',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '❓',
    };
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Check for setup completion from URL params
  useEffect(() => {
    const setup = searchParams.get('setup');
    if (setup === 'complete') {
      setSuccessMessage('Your payment account has been set up successfully!');
      // Clear URL params
      router.replace('/payouts', { scroll: false });
      // Clear message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } else if (setup === 'error') {
      setStripeError('There was an issue syncing your account status. Please refresh the page.');
      // Clear URL params
      router.replace('/payouts', { scroll: false });
    }
  }, [searchParams, router]);

  // Check user's Stripe Connect status
  const hasStripeSetup = user?.connect_payouts_enabled || false;
  const onboardingComplete = user?.connect_onboarding_complete || false;
  const onboardedAt = user?.connect_onboarded_at;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Payouts</h1>
          <p className="mt-2 text-slate-600">
            Manage your payment settings and view your prize winnings
          </p>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* SECTION 1: STRIPE CONNECT STATUS */}
        {/* ═══════════════════════════════════ */}
        <div className="mb-8">
          {successMessage && (
            <Alert variant="success" className="mb-4">
              {successMessage}
            </Alert>
          )}

          {stripeError && (
            <Alert variant="error" className="mb-4">
              {stripeError}
            </Alert>
          )}

          {!onboardingComplete ? (
            // NOT SET UP
            <div className="bg-white rounded-2xl shadow-card overflow-hidden border-l-8 border-l-yellow-500 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Set Up Payouts</h2>
                  <p className="text-slate-600 text-sm">Connect your bank account to receive prizes</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-16">
                <div>
                  <p className="text-slate-700">
                    You need to connect your bank account through Stripe to receive your competition prizes.
                    The setup process takes about 5 minutes and ensures secure transfers to your account.
                  </p>
                </div>
                <Button
                  onClick={() => setupStripeMutation.mutate()}
                  disabled={setupStripeMutation.isPending}
                  variant="secondary"
                  className="whitespace-nowrap"
                >
                  {setupStripeMutation.isPending ? 'Loading...' : 'Set Up Stripe Connect'}
                </Button>
              </div>
            </div>
          ) : onboardingComplete && !hasStripeSetup ? (
            // ACTION REQUIRED - Onboarded but payouts not enabled
            <div className="bg-white rounded-2xl shadow-card overflow-hidden border-l-8 border-l-yellow-500 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">⚠️</div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Action Required</h2>
                  <p className="text-slate-600 text-sm">Complete your bank account setup</p>
                </div>
              </div>
              <p className="text-slate-700 mb-6">
                Your Stripe Connect account is partially set up, but you need to complete
                the verification process to receive payments.
              </p>
              <Button
                onClick={() => updatePaymentMutation.mutate()}
                disabled={updatePaymentMutation.isPending}
                variant="primary"
                className="w-full sm:w-auto"
              >
                {updatePaymentMutation.isPending ? 'Loading...' : 'Complete Setup'}
              </Button>
            </div>
          ) : (
            // READY - Onboarded and payouts enabled
            <div className="bg-white rounded-2xl shadow-card overflow-hidden border-l-8 border-l-brand-600 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Ready to Receive Payments</h2>
                  <p className="text-slate-600 text-sm">Your bank account is connected</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-slate-700 mb-1">
                    <span className="font-semibold">Status:</span> Active
                  </p>
                  {onboardedAt && (
                    <p className="text-sm text-slate-500 mb-2">
                      Connected since {new Date(onboardedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  <p className="text-sm text-slate-500">
                    Prize winnings will be transferred to your connected account
                  </p>
                </div>
                <Button
                  onClick={() => updatePaymentMutation.mutate()}
                  disabled={updatePaymentMutation.isPending}
                  variant="secondary"
                  className="whitespace-nowrap"
                >
                  {updatePaymentMutation.isPending ? 'Loading...' : 'Update Payment Method'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════ */}
        {/* SECTION 2: YOUR WINNINGS */}
        {/* ═══════════════════════════════════ */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Winnings</h2>

          {winningsLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : !winnings || winnings.length === 0 ? (
            // EMPTY STATE
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No winnings yet</h3>
              <p className="text-gray-600 mb-6">
                Find competitions to secure funding!
              </p>
              <Link href="/competitions">
                <Button variant="primary">Browse Competitions</Button>
              </Link>
            </div>
          ) : (
            // WINNINGS CARDS
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {winnings.map((winning) => {
                const placement = getPlacementDisplay(winning.submission?.placement);
                const paymentStatus = getPaymentStatus(winning.status, hasStripeSetup);

                return (
                  <Link
                    key={winning.id}
                    href={`/competitions/${winning.competition?.id}/results`}
                    className="group"
                  >
                    <div className="bg-white rounded-2xl shadow-card overflow-hidden flex flex-col h-full transition-all duration-300 hover:scale-[1.01]">
                      {/* Image Section - with overlay elements */}
                      <div className="relative aspect-[21/9] overflow-hidden">
                        {winning.competition?.image_url ? (
                          <>
                            <img
                              src={winning.competition.image_url}
                              alt={winning.competition.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                          </>
                        ) : (
                          <div className="relative h-full bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200">
                            <div className="absolute inset-0 opacity-5">
                              <div className="absolute top-4 left-4 text-8xl">🌱</div>
                              <div className="absolute bottom-4 right-4 text-8xl">🌿</div>
                            </div>
                          </div>
                        )}

                        {/* Domain tags - bottom-left */}
                        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                          {winning.competition?.domain?.split(',').map((domain, index) => (
                            <span
                              key={index}
                              className="inline-block px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-700 shadow-sm"
                            >
                              {domain.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 flex-1 flex flex-col items-center justify-center text-center relative min-h-[140px] -mt-2">
                        {/* Competition Title */}
                        <h3 className="text-sm font-bold text-slate-900 mb-4 line-clamp-2 group-hover:text-brand-600 transition-colors duration-200">
                          {winning.competition?.title || 'Unknown Competition'}
                        </h3>

                        {/* Prize Amount */}
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(winning.amount)}</span>
                          <span className="text-sm text-slate-500">prize</span>
                        </div>

                        {/* Payment Status - bottom left */}
                        <div className="absolute bottom-2 left-5 text-xs text-slate-500 flex items-center gap-3">
                          {winning.status === 'completed' ? (
                            <svg className="w-3 h-3 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
                            </svg>
                          )}
                          <span className="font-semibold">{paymentStatus.text}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <ProtectedRoute>
      <PayoutsContent />
    </ProtectedRoute>
  );
}
