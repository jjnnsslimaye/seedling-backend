'use client';

/**
 * Judge Dashboard page
 */

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { getJudgeAssignments } from '@/lib/api/judging';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Alert from '@/components/ui/Alert';
import { ExpandableSection } from '@/components/ui';

function JudgeDashboardContent() {
  const { user } = useAuth();

  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    active: true,
    upcoming: true,
    completed: true,
  });

  // Fetch judge assignments
  const {
    data: assignments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['judge-assignments'],
    queryFn: getJudgeAssignments,
  });

  console.log('Dashboard query key:', ['judge-assignments']);

  // Calculate stats
  const totalAssignments = assignments?.reduce(
    (sum, assignment) => sum + assignment.total,
    0
  ) || 0;
  const completedAssignments = assignments?.reduce(
    (sum, assignment) => sum + assignment.completed,
    0
  ) || 0;
  const pendingAssignments = totalAssignments - completedAssignments;

  // Categorize assignments into three sections
  const activeJudging = assignments?.filter(
    (assignment) =>
      assignment.competition.status === 'judging' &&
      assignment.total > 0 &&
      assignment.completed < assignment.total
  ) || [];

  const upcomingAssignments = assignments?.filter(
    (assignment) =>
      assignment.competition.status === 'closed' &&
      assignment.total > 0
  ) || [];

  const completedAssignments_section = assignments?.filter(
    (assignment) =>
      assignment.competition.status === 'complete' ||
      (assignment.total > 0 && assignment.completed === assignment.total)
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Judge Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Review and score assigned submissions
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12">
            <Loading size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="error">
            {error instanceof Error
              ? error.message
              : 'Failed to load judge assignments'}
          </Alert>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <div className="space-y-8">
            {/* Empty State */}
            {(!assignments || assignments.length === 0) && (
              <Card>
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="mt-4 text-lg text-gray-600">
                    No submissions assigned yet
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    You will see your judging assignments here once they are
                    assigned to you.
                  </p>
                </div>
              </Card>
            )}

            {/* SECTION 1: UPCOMING ASSIGNMENTS */}
            <ExpandableSection
              title="Upcoming Assignments"
              count={upcomingAssignments.length}
              isExpanded={expandedSections.upcoming}
              onToggle={() => setExpandedSections(prev => ({ ...prev, upcoming: !prev.upcoming }))}
              badgeColor="purple"
              emptyMessage="No upcoming assignments"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingAssignments.map((assignment) => (
                  <Card
                    key={assignment.competition.id}
                    className="border-l-4 border-blue-500 opacity-90"
                  >
                    {/* Competition Title */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {assignment.competition.title}
                      </h3>

                      {/* Domain Badge */}
                      <div className="flex flex-wrap gap-1">
                        {assignment.competition.domain.split(',').map((d, i) => (
                          <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800 border border-brand-200">
                            {d.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Competition Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="h-5 w-5 mr-2 text-gray-400"
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
                        Prize Pool: ${assignment.competition.prize_pool.toLocaleString()}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="h-5 w-5 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Deadline: {new Date(assignment.competition.deadline).toLocaleDateString()}
                      </div>

                      {/* Assignments Count */}
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="h-5 w-5 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {assignment.total} submissions assigned
                      </div>
                    </div>

                    {/* Info Message */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <svg
                          className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-sm text-blue-800">
                          Judging will begin shortly.
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <div className="relative group flex-1">
                        <Button
                          disabled
                          className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                        >
                          View Submissions
                        </Button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          Judging has not started yet
                        </div>
                      </div>
                      <Link
                        href={`/competitions/${assignment.competition.id}`}
                        className="flex-1"
                      >
                        <Button variant="secondary" className="w-full">
                          View Competition
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </ExpandableSection>

            {/* SECTION 2: ACTIVE JUDGING */}
            <ExpandableSection
              title="Active Assignments"
              count={activeJudging.length}
              isExpanded={expandedSections.active}
              onToggle={() => setExpandedSections(prev => ({ ...prev, active: !prev.active }))}
              badgeColor="purple"
              emptyMessage="No active assignments"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeJudging.map((assignment) => {
                  const progressPercent =
                    assignment.total > 0
                      ? (assignment.completed / assignment.total) * 100
                      : 0;

                  return (
                    <Card
                      key={assignment.competition.id}
                      className="hover:shadow-lg transition-shadow border-l-4 border-purple-500"
                    >
                      {/* Competition Title */}
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {assignment.competition.title}
                        </h3>

                        {/* Domain Badge */}
                        <div className="flex flex-wrap gap-1">
                          {assignment.competition.domain.split(',').map((d, i) => (
                            <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800 border border-brand-200">
                              {d.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Competition Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="h-5 w-5 mr-2 text-gray-400"
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
                          Prize Pool: ${assignment.competition.prize_pool.toLocaleString()}
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="h-5 w-5 mr-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Deadline: {new Date(assignment.competition.deadline).toLocaleDateString()}
                        </div>

                        {/* Assignments Count */}
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="h-5 w-5 mr-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {assignment.total} submissions assigned
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Progress
                          </span>
                          <span className="text-sm font-medium text-purple-600">
                            Scored {assignment.completed} of {assignment.total} submissions
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-purple-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link
                          href={`/judge/competitions/${assignment.competition.id}/submissions`}
                          className="flex-1"
                        >
                          <Button className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                            Continue Judging
                          </Button>
                        </Link>
                        <Link
                          href={`/competitions/${assignment.competition.id}`}
                          className="flex-1"
                        >
                          <Button variant="secondary" className="w-full">
                            View Competition
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ExpandableSection>

            {/* SECTION 3: COMPLETED */}
            <ExpandableSection
              title="Completed Assignments"
              count={completedAssignments_section.length}
              isExpanded={expandedSections.completed}
              onToggle={() => setExpandedSections(prev => ({ ...prev, completed: !prev.completed }))}
              badgeColor="purple"
              emptyMessage="No completed assignments"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedAssignments_section.map((assignment) => (
                  <Card
                    key={assignment.competition.id}
                    className="border-l-4 border-gray-500 bg-slate-50"
                  >
                    {/* Competition Title */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {assignment.competition.title}
                        </h3>
                        {/* Completion Badge */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <svg
                            className="h-3 w-3 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Complete
                        </span>
                      </div>

                      {/* Domain Badge */}
                      <div className="flex flex-wrap gap-1">
                        {assignment.competition.domain.split(',').map((d, i) => (
                          <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-800 border border-brand-200">
                            {d.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Competition Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="h-5 w-5 mr-2 text-gray-400"
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
                        Prize Pool: ${assignment.competition.prize_pool.toLocaleString()}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="h-5 w-5 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Deadline: {new Date(assignment.competition.deadline).toLocaleDateString()}
                      </div>

                      {/* Assignments Count */}
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="h-5 w-5 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {assignment.total} submissions assigned
                      </div>
                    </div>

                    {/* Completion Message */}
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start">
                        <svg
                          className="h-5 w-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-sm text-purple-800">
                          Judging complete. You scored all {assignment.total} submissions.
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link
                        href={`/judge/competitions/${assignment.competition.id}/submissions`}
                        className="flex-1"
                      >
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                          View Scores
                        </Button>
                      </Link>
                      <Link
                        href={`/competitions/${assignment.competition.id}`}
                        className="flex-1"
                      >
                        <Button variant="secondary" className="w-full">
                          View Competition
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </ExpandableSection>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JudgeDashboardPage() {
  return (
    <ProtectedRoute requiredRole="judge">
      <JudgeDashboardContent />
    </ProtectedRoute>
  );
}
