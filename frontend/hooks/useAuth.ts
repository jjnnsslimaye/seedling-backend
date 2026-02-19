'use client';

/**
 * Custom hook for accessing authentication state and actions
 */

import { useAuthStore } from '@/store/authStore';
import { User } from '@/lib/types';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  // Map JWT 'sub' to 'id' for convenience
  const userWithId = user ? {
    ...user,
    id: user.sub ? Number(user.sub) : undefined
  } : null;

  /**
   * Helper function to check if user has a specific role
   */
  const isRole = (role: string): boolean => {
    return userWithId?.role === role;
  };

  return {
    user: userWithId,  // Return user with id field mapped from sub
    token,
    isAuthenticated,
    login,
    logout,
    isRole,
  };
};
