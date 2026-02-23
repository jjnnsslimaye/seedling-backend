/**
 * Admin API functions
 */

import { api } from '@/lib/api';
import { Competition } from '@/lib/types';

export interface CreateCompetitionRequest {
  title: string;
  description: string;
  domain: string;
  entry_fee: number;
  max_entries: number;
  deadline: string;
  open_date: string;
  judging_sla_days: number;
  rubric: Record<string, any>;
  prize_structure: Record<string, number>;
  platform_fee_percentage: number;
}

/**
 * Get all competitions for admin view
 */
export async function getAdminCompetitions(): Promise<Competition[]> {
  const response = await api.get('/competitions');
  return response.data;
}

/**
 * Create a new competition
 */
export async function createCompetition(data: CreateCompetitionRequest): Promise<Competition> {
  const response = await api.post('/competitions', data);
  return response.data;
}

/**
 * Get ranked submissions with scores for a competition
 */
export async function getCompetitionLeaderboard(competitionId: number) {
  const response = await api.get(`/admin/competitions/${competitionId}/leaderboard`);
  return response.data;
}

/**
 * Get all submissions for a competition (admin only)
 */
export async function getCompetitionSubmissions(competitionId: number) {
  const response = await api.get(`/judging/competitions/${competitionId}/submissions`);
  return response.data;
}

/**
 * Get all prize payout payments for a competition
 */
export async function getCompetitionPayments(competitionId: number) {
  const response = await api.get(`/admin/competitions/${competitionId}/payments`);
  return response.data;
}

/**
 * Assign judges to competition submissions
 * @param replace - If true, replaces all existing assignments
 */
export async function assignJudges(
  competitionId: number,
  data: {
    assignments: Array<{
      judge_id: number;
      submission_ids: number[];
    }>;
  },
  replace: boolean = true
) {
  const params = new URLSearchParams();
  if (replace) {
    params.append('replace', 'true');
  }

  const url = `/admin/competitions/${competitionId}/assign-judges${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.post(url, data);
  return response.data;
}

/**
 * Select competition winners
 */
export async function selectWinners(
  competitionId: number,
  winners: Array<{
    submission_id: number;
    place: 'first' | 'second' | 'third';
  }>
) {
  const response = await api.post(
    `/admin/competitions/${competitionId}/select-winners`,
    { winners }
  );
  return response.data;
}

/**
 * Distribute prizes to winners via Stripe
 */
export async function distributePrizes(competitionId: number) {
  const response = await api.post(
    `/admin/competitions/${competitionId}/distribute-prizes`
  );
  return response.data;
}

/**
 * Update competition details (status only)
 */
export async function updateCompetition(competitionId: number, data: any) {
  const response = await api.patch(`/competitions/${competitionId}`, data);
  return response.data;
}

/**
 * Update competition full details (all fields)
 */
export async function updateCompetitionDetails(competitionId: number, data: CreateCompetitionRequest) {
  const response = await api.patch(`/competitions/${competitionId}`, data);
  return response.data;
}

/**
 * Get all users (for judge assignment)
 */
export async function getAllUsers() {
  const response = await api.get('/users');
  return response.data;
}

/**
 * Get all judge assignments for a competition
 */
export async function getJudgeAssignments(competitionId: number) {
  const response = await api.get(`/admin/competitions/${competitionId}/judge-assignments`);
  return response.data;
}

/**
 * Reassign a judge assignment to a different judge
 */
export async function reassignJudge(assignmentId: number, newJudgeId: number) {
  const response = await api.patch(`/admin/judge-assignments/${assignmentId}`, {
    new_judge_id: newJudgeId,
  });
  return response.data;
}

/**
 * Delete a competition (only draft competitions)
 */
export async function deleteCompetition(competitionId: number) {
  const response = await api.delete(`/competitions/${competitionId}`);
  return response.data;
}

/**
 * Update user role
 */
export async function updateUserRole(userId: number, role: string) {
  const response = await api.patch(`/users/${userId}/role`, { role });
  return response.data;
}
