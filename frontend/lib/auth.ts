'use client';

/**
 * Authentication utility functions for token management
 */

import { jwtDecode } from 'jwt-decode';
import { User } from './types';

const TOKEN_KEY = 'token';

/**
 * Save authentication token to localStorage
 */
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Retrieve authentication token from localStorage
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Remove authentication token from localStorage
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Decode JWT token to get user information
 */
export function decodeToken(token: string): User {
  if (process.env.NODE_ENV === 'development') {
    console.log('=== DECODE TOKEN ===');
    console.log('Token to decode:', token.substring(0, 20) + '...');
  }
  const decoded = jwtDecode<User>(token);
  if (process.env.NODE_ENV === 'development') {
    console.log('Decoded token payload:', decoded);
    console.log('Decoded user ID:', decoded?.id);
    console.log('Decoded user sub:', (decoded as any)?.sub);
  }
  return decoded;
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  const token = getToken();

  if (!token) {
    return false;
  }

  try {
    const decoded = jwtDecode<{ exp: number }>(token);

    // Check if token is expired
    if (decoded.exp) {
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    }

    return true;
  } catch (error) {
    // Invalid token
    return false;
  }
}

/**
 * Get the current user's role from the token
 */
export function getUserRole(): string | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const decoded = decodeToken(token);
    return decoded.role;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user information from the token
 */
export function getCurrentUser(): User | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    return decodeToken(token);
  } catch (error) {
    return null;
  }
}
