/**
 * Judging API functions
 */

import { api } from '../api';
import {
  Competition,
  Submission,
  JudgeAssignment,
  SubmissionWithVideo,
} from '../types';

/**
 * Get all competitions where current user is assigned as judge
 */
export async function getJudgeAssignments(): Promise<JudgeAssignment[]> {
  const response = await api.get<JudgeAssignment[]>('/judging/assignments');
  return response.data;
}

/**
 * Get submissions assigned to judge for specific competition
 */
export async function getAssignedSubmissions(
  competitionId: number
): Promise<Submission[]> {
  const response = await api.get<Submission[]>(
    `/judging/competitions/${competitionId}/submissions`
  );
  return response.data;
}

/**
 * Get full submission details for judging
 */
export async function getSubmissionForJudging(
  submissionId: number
): Promise<SubmissionWithVideo> {
  const response = await api.get<SubmissionWithVideo>(
    `/judging/submissions/${submissionId}`
  );
  return response.data;
}

/**
 * Submit judge's scores for a submission
 */
export async function submitScore(
  submissionId: number,
  data: {
    criteria_scores: Record<string, number>;
    feedback?: string;
  }
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    `/judging/submissions/${submissionId}/score`,
    data
  );
  return response.data;
}
