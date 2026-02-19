'use client';

/**
 * Hook to initialize user data from API on app load
 *
 * The JWT token only contains user ID and role.
 * This hook fetches the full user profile (username, email, etc.)
 * and updates the auth store so it's available everywhere.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from './useAuth';
import { api } from '@/lib/api';

export const useInitializeUser = () => {
  const { isAuthenticated, user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);

  // Fetch full user profile from API
  const { data: fullUserData } = useQuery({
    queryKey: ['initialize-user', user?.id],
    queryFn: async () => {
      console.log('Fetching full user profile for initialization...');
      const response = await api.get('/users/me');
      console.log('Full user data fetched:', response.data);
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id && !user?.username, // Only fetch if username is missing
    staleTime: Infinity, // Cache forever - only fetch once on app load
  });

  // Update auth store when full user data is fetched
  useEffect(() => {
    if (fullUserData) {
      const currentUser = useAuthStore.getState().user;
      if (currentUser && !currentUser.username) {
        // Only update if username is missing (not already initialized)
        console.log('Updating auth store with full user data');
        setUser({
          ...currentUser,
          username: fullUserData.username,
          email: fullUserData.email,
          created_at: fullUserData.created_at,
          // Stripe Connect fields
          stripe_connect_account_id: fullUserData.stripe_connect_account_id,
          connect_onboarding_complete: fullUserData.connect_onboarding_complete,
          connect_charges_enabled: fullUserData.connect_charges_enabled,
          connect_payouts_enabled: fullUserData.connect_payouts_enabled,
          connect_onboarded_at: fullUserData.connect_onboarded_at,
        });
      }
    }
  }, [fullUserData, setUser]); // Only depend on fullUserData and setUser
};
