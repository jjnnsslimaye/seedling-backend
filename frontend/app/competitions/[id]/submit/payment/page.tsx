'use client';

/**
 * Stripe payment page for competition entry fees
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useQuery } from '@tanstack/react-query';
import { getCompetition } from '@/lib/api/competitions';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Alert, Loading } from '@/components/ui';

// Debug environment variables
if (process.env.NODE_ENV === 'development') {
  console.log('Environment check:');
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('Stripe Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  console.log('Stripe Key length:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.length);
}

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface PaymentFormProps {
  submissionId: string;
  competition: any;
}

function PaymentForm({ submissionId, competition }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id;

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [succeeded, setSucceeded] = useState(false);
  const [ready, setReady] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe not loaded:', { stripe: !!stripe, elements: !!elements });
      return;
    }

    setProcessing(true);
    setError('');

    if (process.env.NODE_ENV === 'development') {
      console.log('=== PAYMENT SUBMISSION DEBUG ===');
      console.log('Stripe loaded:', !!stripe);
      console.log('Elements loaded:', !!elements);
      console.log('Submission ID:', submissionId);
      console.log('Competition ID:', competitionId);
    }

    try {
      // Step 1: Create payment intent when Pay Now clicked
      if (process.env.NODE_ENV === 'development') {
        console.log('Creating payment intent...');
      }
      const token = localStorage.getItem('token');
      const intentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/submissions/${submissionId}/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!intentResponse.ok) {
        const errorData = await intentResponse.json();
        throw new Error(errorData.detail || 'Failed to create payment intent');
      }

      const { client_secret } = await intentResponse.json();
      if (process.env.NODE_ENV === 'development') {
        console.log('Payment intent created successfully');
      }

      // Step 2: Get card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Step 3: Confirm payment with card details
      if (process.env.NODE_ENV === 'development') {
        console.log('Confirming payment...');
      }
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        {
          payment_method: {
            card: cardElement
          }
        }
      );

      if (error) {
        console.error('Payment error:', error);
        setError(error.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      // Step 4: Success - redirect to success page
      if (process.env.NODE_ENV === 'development') {
        console.log('Payment successful:', paymentIntent);
      }
      router.push(`/competitions/${competitionId}/submit/success?submission_id=${submissionId}`);

    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Payment exception:', err);
      }
      setError(err.message || 'An unexpected error occurred');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/competitions/${competitionId}/submit?draft_id=${submissionId}`)}
          className="mb-6 flex items-center text-brand-600 hover:text-brand-800 font-medium"
          disabled={processing}
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
          Back to Submission Form
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Complete Your Entry
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Pay the entry fee to finalize your submission
          </p>
        </div>

        {/* Two Column Layout */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT SECTION - Payment Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Payment Card */}
              <Card title="Payment Details">
                <div className="space-y-6">
                  {/* Error Alert */}
                  {error && (
                    <Alert variant="error">
                      <p className="font-semibold">Payment Failed</p>
                      <p className="text-sm mt-1">{error}</p>
                    </Alert>
                  )}

                  {/* Stripe Card Element */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Details
                    </label>
                    <div className="border border-gray-300 rounded-md p-3 bg-white">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#424770',
                              '::placeholder': {
                                color: '#aab7c4',
                              },
                            },
                            invalid: {
                              color: '#9e2146',
                            },
                          },
                        }}
                        onReady={() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('CardElement is ready');
                          }
                          setReady(true);
                        }}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!ready || !stripe || processing || succeeded}
                    className="w-full text-lg py-3"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 mr-3"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Pay ${formatCurrency(competition.entry_fee)} and Submit Entry`
                    )}
                  </Button>
                </div>
              </Card>

              {/* Security Note */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      <strong>Secure Payment:</strong> Your payment is processed
                      securely by Stripe. We never see or store your card details.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SECTION - Sticky Sidebar */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-8 space-y-6">
                {/* Entry Summary */}
                <Card title="Entry Summary">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Competition</p>
                      <p className="font-semibold text-gray-900">
                        {competition.title}
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-600 mb-2">
                        You're paying for
                      </p>
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-slate-900">Entry Fee</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {formatCurrency(competition.entry_fee)}
                        </span>
                      </div>

                      {/* Platform Fee - percentage only */}
                      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                        <span className="text-sm text-slate-600">Platform Fee</span>
                        <span className="text-sm font-semibold text-slate-600">
                          {competition.platform_fee_percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                      <p className="text-xs text-brand-700">
                        This fee contributes to the prize pool and covers platform
                        costs.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* What Happens Next */}
                <Card title="What Happens Next">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="ml-2 text-sm text-gray-700">
                        Payment processed securely
                      </p>
                    </div>
                    <div className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="ml-2 text-sm text-gray-700">
                        Submission entered into competition
                      </p>
                    </div>
                    <div className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="ml-2 text-sm text-gray-700">
                        Email confirmation sent
                      </p>
                    </div>
                    <div className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="ml-2 text-sm text-gray-700">
                        Scoring and feedback when judging begins
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const competitionId = Number(params.id);

  const submissionId = searchParams.get('submission_id');

  // Fetch competition details
  const {
    data: competition,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => getCompetition(competitionId),
    enabled: !!competitionId,
  });

  // Check for required params
  if (!submissionId) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error">
            <p className="font-semibold">Invalid Payment Link</p>
            <p className="text-sm mt-1">
              Missing submission ID. Please try submitting again.
            </p>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push(`/competitions/${competitionId}/submit${submissionId ? `?draft_id=${submissionId}` : ''}`)}>
              Back to Submission Form
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="font-semibold">Failed to load competition</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'Competition not found'}
            </p>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push(`/competitions/${competitionId}/submit${submissionId ? `?draft_id=${submissionId}` : ''}`)}>
              Back to Submission Form
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render payment form with Stripe Elements
  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#4f46e5',
          },
        },
      }}
    >
      <PaymentForm submissionId={submissionId} competition={competition} />
    </Elements>
  );
}

export default function PaymentPage() {
  return (
    <ProtectedRoute requiredRole="founder">
      <PaymentPageContent />
    </ProtectedRoute>
  );
}
