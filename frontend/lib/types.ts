/**
 * TypeScript type definitions for the Seedling platform
 */

export interface User {
  id?: number;  // Mapped from JWT 'sub'
  sub?: string; // JWT subject (user ID as string)
  username?: string;
  email?: string;
  role: 'founder' | 'judge' | 'admin';
  created_at?: string;
  // Stripe Connect fields for payout status
  stripe_connect_account_id?: string;
  connect_onboarding_complete?: boolean;
  connect_charges_enabled?: boolean;
  connect_payouts_enabled?: boolean;
  connect_onboarded_at?: string;
}

export interface Competition {
  id: number;
  title: string;
  description: string;
  domain: string;
  entry_fee: number;
  prize_pool: number;
  platform_fee_percentage: number;
  max_entries: number;
  current_entries: number;
  deadline: string;
  open_date: string;
  judging_sla_days: number;
  status: 'draft' | 'upcoming' | 'active' | 'closed' | 'judging' | 'complete';
  rubric: Record<string, { weight: number; description?: string }>;
  prize_structure: Record<string, number>;
  image_key?: string;
  image_url?: string;
}

export interface Submission {
  id: number;
  competition_id: number;
  user_id: number;
  title: string;
  description: string;
  status: string;
  video_url?: string;
  final_score?: number;
  placement?: string;
  submitted_at?: string;
  created_at: string;
  // Full competition object when included in response
  competition?: Competition;
  // Rubric from competition
  rubric?: Record<string, { weight: number }>;
  // Judge scoring fields
  is_scored?: boolean;
  parsed_human_scores?: Array<{
    judge_id: number;
    judge_name: string;
    criteria_scores: Record<string, number>;
    overall: number;
    feedback: string;
    submitted_at: string;
  }>;
  judge_score?: number;
  judge_feedback?: Array<Record<string, any>>;
  founder_username?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string;
}

export interface JudgeAssignment {
  competition: Competition;
  submissions: Submission[];
  completed: number;
  total: number;
}

export interface SubmissionWithVideo extends Submission {
  video_url?: string;
}
