/**
 * Singleton QueryClient instance
 * Shared across React components and non-React code (like Zustand stores)
 */

import { QueryClient } from '@tanstack/react-query';

// Create a singleton QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});
