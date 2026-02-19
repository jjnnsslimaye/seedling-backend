'use client';

/**
 * Stripe Connect Onboarding Completion Page
 * Syncs account status after user completes Stripe onboarding
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ConnectCompletePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>('syncing');

  useEffect(() => {
    const syncStripeStatus = async () => {
      try {
        // Sync Stripe Connect account status
        await api.get('/users/me/connect-account/status');

        // Invalidate user queries to refetch with updated Stripe info
        queryClient.invalidateQueries({ queryKey: ['initialize-user'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });

        setStatus('success');

        // Redirect to payouts page after successful sync
        setTimeout(() => {
          router.push('/payouts?setup=complete');
        }, 1500);
      } catch (error) {
        console.error('Failed to sync Stripe status:', error);
        setStatus('error');

        // Still redirect to payouts even on error (user can try again)
        setTimeout(() => {
          router.push('/payouts?setup=error');
        }, 2000);
      }
    };

    syncStripeStatus();
  }, [router, queryClient]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'syncing' && (
          <>
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-brand-600"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Completing Setup...
            </h1>
            <p className="text-gray-600">
              We're syncing your Stripe Connect account. This will only take a moment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6 text-6xl">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Setup Complete!
            </h1>
            <p className="text-gray-600">
              Your payment account is ready. Redirecting to payouts...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6 text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Almost There
            </h1>
            <p className="text-gray-600">
              We couldn't sync your status right now, but you can check it on the payouts page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
