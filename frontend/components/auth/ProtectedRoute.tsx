'use client';

/**
 * Protected route component for authentication and role-based access control
 */

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated) {
      // Not authenticated - redirect to login
      router.push('/login');
      return;
    }

    // If we reach here, user is authenticated
    setLoading(false);
  }, [isAuthenticated, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - don't render anything (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  // Check role if required
  if (requiredRole && user?.role.toLowerCase() !== requiredRole.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-red-50 p-8">
            <div className="flex flex-col items-center">
              <svg
                className="h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-red-800">
                Access Denied
              </h3>
              <p className="mt-2 text-sm text-red-700">
                You don&apos;t have permission to access this page.
              </p>
              <p className="mt-1 text-xs text-red-600">
                Required role: {requiredRole}
              </p>
              <p className="mt-1 text-xs text-red-600">
                Your role: {user?.role}
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated and authorized - render children
  return <>{children}</>;
}
