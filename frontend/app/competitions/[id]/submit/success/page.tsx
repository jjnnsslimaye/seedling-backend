'use client';

/**
 * Payment success page
 */

import { useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button } from '@/components/ui';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const competitionId = Number(params.id);

  const submissionId = searchParams.get('submission_id');
  const paymentIntent = searchParams.get('payment_intent');

  useEffect(() => {
    console.log('Payment success:', { submissionId, paymentIntent });

    // Invalidate queries to refetch fresh data after successful payment
    queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
    queryClient.invalidateQueries({ queryKey: ['competitions'] });
    queryClient.invalidateQueries({ queryKey: ['submissions'] });
    queryClient.invalidateQueries({ queryKey: ['submission', Number(submissionId)] });
    queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
    queryClient.invalidateQueries({ queryKey: ['user-submissions', competitionId] });
  }, [submissionId, paymentIntent, competitionId, queryClient]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Card */}
        <Card className="text-center py-12">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <svg
              className="h-12 w-12 text-green-600"
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

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Submission Complete!
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Your entry has been successfully submitted and payment has been
            processed. Good luck in the competition!
          </p>

          {/* What's Next Section */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              What Happens Next?
            </h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <svg
                  className="h-6 w-6 text-brand-500 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">
                    Confirmation Email
                  </p>
                  <p className="text-sm text-gray-600">
                    Check your email for a receipt and submission confirmation
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <svg
                  className="h-6 w-6 text-brand-500 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Judge Review</p>
                  <p className="text-sm text-gray-600">
                    Expert judges will review your submission and provide scores
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <svg
                  className="h-6 w-6 text-brand-500 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">
                    Track Your Progress
                  </p>
                  <p className="text-sm text-gray-600">
                    View your submission status and scores in your dashboard
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <svg
                  className="h-6 w-6 text-brand-500 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Results & Prizes</p>
                  <p className="text-sm text-gray-600">
                    Winners will be announced after judging is complete
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              onClick={() => router.push('/dashboard')}
              className="px-8"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/competitions/${competitionId}`)}
              className="px-8"
            >
              View Competition
            </Button>
          </div>

          {/* Reference Numbers */}
          {submissionId && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Submission ID: <span className="font-mono">{submissionId}</span>
              </p>
              {paymentIntent && (
                <p className="text-sm text-gray-500 mt-1">
                  Payment ID:{' '}
                  <span className="font-mono">{paymentIntent}</span>
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <ProtectedRoute requiredRole="founder">
      <SuccessContent />
    </ProtectedRoute>
  );
}
