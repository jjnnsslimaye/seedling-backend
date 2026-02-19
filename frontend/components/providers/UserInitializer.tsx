'use client';

/**
 * Client component that initializes user data on app load
 * This fetches the full user profile and updates the auth store
 */

import { useInitializeUser } from '@/hooks/useInitializeUser';

export default function UserInitializer({ children }: { children: React.ReactNode }) {
  // Initialize user data from API
  useInitializeUser();

  return <>{children}</>;
}
