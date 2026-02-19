'use client';

/**
 * Admin Dashboard page
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Loading, Alert } from '@/components/ui';
import { getAdminCompetitions } from '@/lib/api/admin';
import { Competition } from '@/lib/types';

type StatusFilter = 'all' | 'draft' | 'upcoming' | 'active' | 'closed' | 'judging' | 'complete';

function AdminDashboardContent() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fetch all competitions
  const {
    data: competitions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-competitions'],
    queryFn: getAdminCompetitions,
  });

  // Filter competitions by status
  const filteredCompetitions = competitions?.filter((comp) => {
    if (statusFilter === 'all') return true;
    return comp.status === statusFilter;
  });

  // Sort by status first, then by domain
  const sortedCompetitions = filteredCompetitions?.sort((a, b) => {
    // Define status order (draft → active → closed → judging → complete)
    const statusOrder: Record<string, number> = {
      draft: 0,
      upcoming: 1,
      active: 2,
      closed: 3,
      judging: 4,
      complete: 5
    };

    // First compare by status
    const statusDiff = (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
    if (statusDiff !== 0) return statusDiff;

    // Then compare by domain alphabetically
    return a.domain.localeCompare(b.domain);
  });

  // Calculate stats
  const totalCompetitions = competitions?.length || 0;
  const activeCompetitions = competitions?.filter((c) => c.status === 'active').length || 0;
  const totalPrizePool = competitions?.reduce((sum, comp) => {
    // Convert prize_pool to number (it might be a string from backend)
    const prizePool = typeof comp.prize_pool === 'string'
      ? parseFloat(comp.prize_pool)
      : comp.prize_pool;
    return sum + (prizePool || 0);
  }, 0) || 0;
  const totalEntries = competitions?.reduce((sum, c) => sum + c.current_entries, 0) || 0;

  // Format large numbers with abbreviations
  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return `${num.toFixed(2)}`;
    }
  };

  // Status badge color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'upcoming':
        return 'bg-purple-100 text-purple-800';
      case 'active':
        return 'bg-brand-100 text-brand-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'judging':
        return 'bg-yellow-100 text-yellow-800';
      case 'complete':
        return 'bg-achievement-100 text-achievement-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error">
            {error instanceof Error
              ? error.message
              : 'Failed to load competitions'}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage competitions and users
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Competitions */}
          <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200 border border-slate-200 border-l-4 border-l-brand-600 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Competitions
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalCompetitions}
                </p>
              </div>
            </div>
          </div>

          {/* Active Competitions */}
          <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200 border border-slate-200 border-l-4 border-l-green-500 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Active Competitions
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {activeCompetitions}
                </p>
              </div>
            </div>
          </div>

          {/* Total Prize Pool */}
          <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200 border border-slate-200 border-l-4 border-l-yellow-500 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Prize Pool
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${formatLargeNumber(totalPrizePool || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Entries */}
          <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200 border border-slate-200 border-l-4 border-l-blue-500 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Entries
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalEntries}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Competitions List */}
        <Card>
          {/* Header with Filter */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Competitions</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  statusFilter === 'all'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  statusFilter === 'draft'
                    ? 'bg-gray-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  statusFilter === 'upcoming'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  statusFilter === 'active'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('closed')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  statusFilter === 'closed'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Closed
              </button>
              <button
                onClick={() => setStatusFilter('judging')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  statusFilter === 'judging'
                    ? 'bg-yellow-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Judging
              </button>
              <button
                onClick={() => setStatusFilter('complete')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  statusFilter === 'complete'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Complete
              </button>
            </div>
          </div>

          {/* Empty State */}
          {sortedCompetitions?.length === 0 && (
            <div className="text-center py-16">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No competitions found
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                {statusFilter !== 'all'
                  ? `No competitions with status "${statusFilter}"`
                  : 'Get started by creating a new competition using the "Create Competition" link in the navigation.'}
              </p>
            </div>
          )}

          {/* Competitions Table */}
          {sortedCompetitions && sortedCompetitions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Competition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prize Pool
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCompetitions.map((competition) => (
                    <tr key={competition.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {competition.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {competition.domain.split(',').map((d, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-100 text-brand-800">
                                  {d.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                            competition.status
                          )}`}
                        >
                          {competition.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {competition.current_entries} / {competition.max_entries}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${competition.prize_pool.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(competition.deadline).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() =>
                            router.push(`/admin/competitions/${competition.id}`)
                          }
                          variant="primary"
                          className="text-sm py-1 px-3"
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
