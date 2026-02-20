'use client';

/**
 * Submission form page for competitions
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getCompetition } from '@/lib/api/competitions';
import { createSubmission, uploadVideo, getSubmission } from '@/lib/api/submissions';
import { ProtectedRoute } from '@/components/auth';
import { Card, Input, Button, Alert, Loading } from '@/components/ui';
import { api } from '@/lib/api';

function SubmitContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const competitionId = Number(params.id);
  const draftId = searchParams.get('draft_id');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch competition
  const {
    data: competition,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => getCompetition(competitionId),
    enabled: !!competitionId,
  });

  // Fetch existing submission if editing draft
  const {
    data: existingSubmission,
    isLoading: isLoadingSubmission,
  } = useQuery({
    queryKey: ['submission', draftId],
    queryFn: () => getSubmission(Number(draftId)),
    enabled: !!draftId,
  });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [hasExistingVideo, setHasExistingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    video?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Cleanup object URL on unmount or when video changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Pre-populate form with existing submission data
  useEffect(() => {
    if (existingSubmission) {
      setTitle(existingSubmission.title || '');
      setDescription(existingSubmission.description || '');
      setIsPublic(existingSubmission.is_public ?? false);

      // Check if submission has video attachment
      const hasVideo = existingSubmission.attachments?.some(
        (att: any) => att.type === 'video'
      );
      setHasExistingVideo(hasVideo || false);
    }
  }, [existingSubmission]);

  // Check if submission is pending payment
  const isPendingPayment = existingSubmission?.status?.toLowerCase() === 'pending_payment';

  // Check if competition is full
  useEffect(() => {
    if (competition && competition.current_entries >= competition.max_entries && !draftId) {
      // Competition is full and user is not editing an existing draft
      alert('This competition is full. Maximum entries reached.');
      router.push(`/competitions/${competitionId}`);
    }
  }, [competition, draftId, competitionId, router]);

  // Prevent editing PENDING_PAYMENT submissions - redirect to payment page
  useEffect(() => {
    if (existingSubmission && isPendingPayment) {
      console.log('PENDING_PAYMENT submission detected, redirecting to payment page');
      router.push(`/competitions/${competitionId}/submit/payment?submission_id=${draftId}`);
    }
  }, [existingSubmission, isPendingPayment, competitionId, draftId, router]);

  // Fetch existing video URL if submission has video
  useEffect(() => {
    const fetchExistingVideoUrl = async () => {
      if (!draftId || !hasExistingVideo) return;

      try {
        const response = await api.get(`/submissions/${draftId}/video-url`);
        setExistingVideoUrl(response.data.video_url);
      } catch (err: any) {
        console.error('Error fetching existing video URL:', err);
        // Don't show error - video might not be uploaded yet for draft
      }
    };

    fetchExistingVideoUrl();
  }, [draftId, hasExistingVideo]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle video file selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        video: 'Video file must be less than 500MB',
      }));
      return;
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        video: 'Please upload a valid video file (MP4, MOV, or AVI)',
      }));
      return;
    }

    // Revoke previous object URL if it exists
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    // Create new object URL for preview
    const previewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(previewUrl);
    setVideoFile(file);
    setErrors((prev) => ({ ...prev, video: undefined }));
  };

  // Handle video removal
  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setVideoFile(null);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Title validation
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    // Description validation
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    // Video validation - require video unless editing and already has one
    if (!videoFile && !hasExistingVideo) {
      newErrors.video = 'Video file is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      console.log('Saving draft submission...');

      let submission;

      if (draftId) {
        // Update existing draft
        console.log('Updating existing draft:', draftId);
        const response = await api.patch(`/submissions/${draftId}`, {
          title,
          description,
          is_public: isPublic,
          status: 'draft',
        });
        submission = response.data;
      } else {
        // Create new submission
        console.log('Creating new draft submission...');
        submission = await createSubmission({
          competition_id: competitionId,
          title,
          description,
          is_public: isPublic,
          status: 'draft',
        });
      }

      console.log('Draft submission saved:', submission);

      // If new video file selected, upload it
      if (videoFile) {
        console.log('Uploading video...');

        // Upload directly to backend with progress tracking
        await uploadVideo(submission.id, videoFile, (progress) => {
          setUploadProgress(progress);
        });

        console.log('Video uploaded successfully');
      }

      setSuccessMessage('Draft saved successfully!');
      setUploadProgress(0);

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submission', submission.id] });
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-submissions', competitionId] });

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setUploadProgress(0);
      setErrors((prev) => ({
        ...prev,
        video:
          err.response?.data?.detail ||
          err.message ||
          'Failed to save draft. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle submit and pay
  const handleSubmitAndPay = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      console.log('Submitting for payment...');

      let submission;

      if (draftId) {
        // Update existing draft (keep as draft for payment)
        console.log('Updating existing draft:', draftId);
        const response = await api.patch(`/submissions/${draftId}`, {
          title,
          description,
          is_public: isPublic,
          status: 'draft',
        });
        submission = response.data;
      } else {
        // Create new submission as draft for payment
        console.log('Creating new draft submission for payment...');
        submission = await createSubmission({
          competition_id: competitionId,
          title,
          description,
          is_public: isPublic,
          status: 'draft',
        });
      }

      console.log('Submission created/updated:', submission);

      // If new video file selected, upload it
      if (videoFile) {
        console.log('Uploading video...');

        // Upload directly to backend with progress tracking
        await uploadVideo(submission.id, videoFile, (progress) => {
          setUploadProgress(progress);
        });

        console.log('Video uploaded successfully');
      }

      // Check if payment is required
      const response = submission as any;

      if (competition?.entry_fee && competition.entry_fee > 0) {
        // Redirect to payment page (payment intent will be created when user clicks Pay Now)
        const paymentUrl = `/competitions/${competitionId}/submit/payment?submission_id=${response.id}`;
        console.log('Redirecting to payment page:', paymentUrl);
        router.push(paymentUrl);
      } else {
        // Free competition - no payment needed
        setSuccessMessage('Submission complete!');

        // Invalidate queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
        queryClient.invalidateQueries({ queryKey: ['competitions'] });
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
        queryClient.invalidateQueries({ queryKey: ['submission', submission.id] });
        queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
        queryClient.invalidateQueries({ queryKey: ['user-submissions', competitionId] });

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error submitting:', err);
      setUploadProgress(0);
      setErrors((prev) => ({
        ...prev,
        video:
          err.response?.data?.detail ||
          err.message ||
          'Failed to submit. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading || (draftId && isLoadingSubmission)) {
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
            <Button onClick={() => router.push(`/competitions/${competitionId}`)}>
              Back to Competition
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

        {/* Success Message */}
        {successMessage && (
          <Alert variant="success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {draftId ? 'Edit Submission' : 'Submit to'} {!draftId && competition.title}
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            {draftId
              ? `Continue editing your submission for ${competition.title}`
              : 'Complete the form below to submit your entry'
            }
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT SECTION - Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Submission Details">
              <div className="space-y-6">
                {/* Title Input */}
                <div>
                  <Input
                    label="Submission Title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={errors.title}
                    placeholder="Enter a compelling title for your submission"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {title.length}/100 characters
                  </p>
                </div>

                {/* Description Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    maxLength={1000}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${
                      errors.description
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="Describe your startup, solution, and why it deserves to win..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {description.length}/1000 characters
                  </p>
                </div>

                {/* Public Submission Option */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded cursor-pointer"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="is_public"
                        className="font-semibold text-slate-900 cursor-pointer"
                      >
                        Make submission public
                      </label>
                      <p className="text-sm text-slate-600 mt-2">
                        Optional: Allow other participants to view your submission video after competition results are released. All other submission material and judges scores and feedback will remain private.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Pitch
                    <span className="text-red-500 ml-1">*</span>
                  </label>

                  {!videoFile && !existingVideoUrl ? (
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-brand-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="video-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500"
                          >
                            <span>Upload a video</span>
                            <input
                              id="video-upload"
                              name="video-upload"
                              type="file"
                              className="sr-only"
                              accept="video/*"
                              onChange={handleVideoChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          MP4, MOV, or AVI up to 500MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-green-600 mb-2 flex items-center gap-2">
                        ✓ {videoFile ? 'New video selected' : 'Video uploaded'}
                      </p>

                      {/* Video preview */}
                      {(videoPreviewUrl || existingVideoUrl) && (
                        <div className="mt-3 border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center p-4">
                          <video
                            src={`${videoPreviewUrl || existingVideoUrl}#t=0.5`}
                            className="max-w-full max-h-64 rounded"
                            controls
                            preload="metadata"
                          />
                        </div>
                      )}

                      {/* File info and change button */}
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          {videoFile && (
                            <>
                              <p className="text-sm text-gray-900 font-medium">
                                {videoFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(videoFile.size)}
                              </p>
                            </>
                          )}
                        </div>
                        <label
                          htmlFor="video-upload-replace"
                          className="cursor-pointer text-sm text-brand-600 hover:text-brand-800 font-medium"
                        >
                          {videoFile || existingVideoUrl ? 'Change video' : 'Upload video'}
                          <input
                            id="video-upload-replace"
                            name="video-upload-replace"
                            type="file"
                            className="sr-only"
                            accept="video/*"
                            onChange={handleVideoChange}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {errors.video && (
                    <p className="mt-1 text-sm text-red-600">{errors.video}</p>
                  )}
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitAndPay}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting
                  ? 'Processing...'
                  : isPendingPayment
                  ? 'Check Payment Status'
                  : `Submit & Pay ${formatCurrency(competition.entry_fee)}`}
              </Button>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Save as Draft:</strong> Save your work without
                    paying. You can complete and submit later.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Submit & Pay:</strong> Finalize your submission and
                    proceed to payment. Entry fee will be charged.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Competition Summary */}
              <Card title="Competition Summary">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Competition</p>
                    <p className="font-semibold text-gray-900">
                      {competition.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Entry Fee</p>
                    <p className="text-2xl font-bold text-brand-600">
                      {formatCurrency(competition.entry_fee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Deadline</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(competition.deadline)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Requirements Checklist */}
              <Card title="Requirements">
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
                      Video submission required
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
                      Entry fee: {formatCurrency(competition.entry_fee)}
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
                      Submit before {formatDate(competition.deadline)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <ProtectedRoute requiredRole="founder">
      <SubmitContent />
    </ProtectedRoute>
  );
}
