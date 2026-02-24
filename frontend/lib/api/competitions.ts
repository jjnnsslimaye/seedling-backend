/**
 * Competition API functions
 */

import { api } from '../api';
import { Competition } from '../types';

export interface CompetitionFilters {
  domain?: string;
  search?: string;
  status?: string;
}

export interface LeaderboardEntry {
  rank: number;
  submission_id: number;
  title: string;
  description?: string;
  user_id: number;
  username: string;
  avatar_url?: string;
  final_score: number | null;
  human_scores_average: number | null;
  num_judges_assigned: number;
  num_judges_completed: number;
  judging_complete: boolean;
  has_tie: boolean;
  is_public: boolean;
}

export interface CompetitionResults {
  competition_id: number;
  competition_title: string;
  domain: string;
  status: string;
  prize_pool: number;
  prize_structure: Record<string, number>;
  entries: LeaderboardEntry[];
  total_submissions: number;
  eligible_submissions: number;
  fully_judged_count: number;
}

/**
 * Get all competitions with optional filters
 */
export async function getCompetitions(
  filters?: CompetitionFilters
): Promise<Competition[]> {
  // Build query params - only include if value exists
  const params: Record<string, string> = {};

  if (filters?.domain) {
    params.domain = filters.domain;
  }

  if (filters?.search) {
    params.search = filters.search;
  }

  // Don't send status - backend doesn't accept it in query params
  // Backend filters by status in its own logic

  if (process.env.NODE_ENV === 'development') {
    console.log('Fetching competitions with params:', params);
  }

  const response = await api.get<Competition[]>('/competitions/', {
    params,
  });

  return response.data;
}

/**
 * Get a single competition by ID
 */
export async function getCompetition(id: number): Promise<Competition> {
  if (process.env.NODE_ENV === 'development') {
    console.log('Fetching competition:', id);
  }

  const response = await api.get<Competition>(`/competitions/${id}`);

  if (process.env.NODE_ENV === 'development') {
    console.log('Backend response:', response.data);
    console.log('Status from backend:', response.data.status, typeof response.data.status);
  }

  return response.data;
}

/**
 * Get competition results/leaderboard (only for completed competitions)
 */
export async function getCompetitionResults(id: number): Promise<CompetitionResults> {
  const response = await api.get<CompetitionResults>(`/competitions/${id}/results`);
  return response.data;
}
