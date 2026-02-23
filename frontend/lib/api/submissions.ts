/**
 * Submissions API functions
 */

import { api } from '../api';

export interface CreateSubmissionData {
  competition_id: number;
  title: string;
  description: string;
  status: 'draft' | 'submitted';
  is_public?: boolean;
}

export interface Submission {
  id: number;
  competition_id: number;
  user_id: number;
  title: string;
  description: string;
  status: string;
  video_url?: string;
  created_at: string;
  placement?: string;
  final_score?: number;
  submitted_at?: string;
  competition?: {
    id: number;
    title: string;
    domain: string;
    status?: string;
    image_url?: string;
    prize_pool?: number;
    prize_structure?: Record<string, number>;
  };
  user?: {
    id: number;
    username: string;
  };
}

export interface DetailedSubmission extends Submission {
  attachments: any[];
  is_public: boolean;
  ai_scores?: any;
  human_scores?: any;
  judge_feedback?: any[];
  updated_at: string;
}

export interface UserWinning {
  id: number;
  amount: number;
  status: string;
  stripe_transfer_id?: string;
  created_at: string;
  processed_at?: string;
  competition?: {
    id: number;
    title: string;
    domain: string;
    image_url?: string;
  };
  submission?: {
    id: number;
    title: string;
    placement: string;
  };
}

/**
 * Create a new submission
 */
export async function createSubmission(data: CreateSubmissionData) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating submission:', data);
    console.log('Creating submission at:', '/submissions');
    console.log('API base URL:', process.env.NEXT_PUBLIC_API_URL);
  }

  const response = await api.post('/submissions/', data);

  if (process.env.NODE_ENV === 'development') {
    console.log('Submission created:', response.data);
  }
  return response.data;
}

/**
 * Upload video file directly to backend with progress tracking
 */
export async function uploadVideo(
  submissionId: number,
  file: File,
  onProgress: (progress: number) => void
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Uploading video for submission:', submissionId);
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    `/submissions/${submissionId}/video`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          if (process.env.NODE_ENV === 'development') {
            console.log('Upload progress:', progress + '%');
          }
          onProgress(progress);
        }
      },
    }
  );

  if (process.env.NODE_ENV === 'development') {
    console.log('Video uploaded successfully:', response.data);
  }
  return response.data;
}

/**
 * Get current user's submissions
 */
export async function getMySubmissions(competitionId?: number): Promise<Submission[]> {
  const params = competitionId ? { competition_id: competitionId } : {};
  const response = await api.get('/submissions/', { params });
  return response.data;
}

/**
 * Get detailed submission info including scores and feedback
 */
export async function getSubmission(submissionId: number): Promise<DetailedSubmission> {
  const response = await api.get(`/submissions/${submissionId}`);
  return response.data;
}

/**
 * Get current user's prize winnings
 */
export async function getMyWinnings(): Promise<UserWinning[]> {
  const response = await api.get('/payments/my-winnings');
  return response.data;
}

/**
 * Get public submission details (any authenticated user can view)
 */
export async function getPublicSubmission(submissionId: number): Promise<DetailedSubmission> {
  const response = await api.get(`/submissions/public/${submissionId}`);
  return response.data;
}

/**
 * Get video URL for a public submission
 */
export async function getPublicSubmissionVideo(submissionId: number): Promise<{ video_url: string; expires_in: number }> {
  const response = await api.get(`/submissions/public/${submissionId}/video-url`);
  return response.data;
}
