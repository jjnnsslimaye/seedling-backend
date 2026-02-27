/**
 * Authentication API functions
 */

import { api } from '../api';

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface PasswordReset {
  token: string;
  new_password: string;
}

/**
 * Request a password reset email
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  const response = await api.post('/auth/request-password-reset', { email });
  return response.data;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<PasswordResetResponse> {
  const response = await api.post('/auth/reset-password/', {
    token,
    new_password: newPassword,
  });
  return response.data;
}
