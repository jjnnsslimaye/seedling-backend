'use client';

/**
 * Zustand store for authentication state management
 */

import { create } from 'zustand';
import { User } from '@/lib/types';
import { saveToken, getToken, removeToken, decodeToken } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

// Initialize state from existing token
const initializeAuth = (): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> => {
  const token = getToken();

  if (token) {
    try {
      const user = decodeToken(token);
      return {
        token,
        user,
        isAuthenticated: true,
      };
    } catch (error) {
      // Invalid token, clear it
      removeToken();
      return {
        token: null,
        user: null,
        isAuthenticated: false,
      };
    }
  }

  return {
    token: null,
    user: null,
    isAuthenticated: false,
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  // Initialize state from localStorage
  ...initializeAuth(),

  // Login action - save token and update state
  login: (token: string) => {
    try {
      // Decode token to get user info
      const user = decodeToken(token);

      // Save token to localStorage
      saveToken(token);

      // Update state
      set({
        token,
        user,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Failed to decode token:', error);
      throw new Error('Invalid token');
    }
  },

  // Logout action - clear token and state
  logout: () => {
    // Remove token from localStorage
    removeToken();

    // Clear ALL React Query cache to prevent cross-user data leakage
    queryClient.clear();

    // Clear state
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  // Update user in state
  setUser: (user: User) => {
    set({ user });
  },
}));
