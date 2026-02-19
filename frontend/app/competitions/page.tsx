'use client';

/**
 * Competitions listing page
 */

import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getCompetitions } from '@/lib/api/competitions';
import { Card, Input, Button, Loading, Alert, ExpandableSection } from '@/components/ui';

const SORT_OPTIONS = ['Prize Pool', 'Deadline', 'Entry Fee'];

// Competition Card Component
function CompetitionCard({
  competition,
  mounted,
  formatCurrency,
  formatDate,
  getDaysUntilDeadline,
  isJudging = false,
  isCompleted = false,
}: {
  competition: any;
  mounted: boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getDaysUntilDeadline: (deadline: string) => number;
  isJudging?: boolean;
  isCompleted?: boolean;
}) {
  const daysLeft = getDaysUntilDeadline(competition.deadline);

  // Calculate prize pool progress
  const platformFeePercentage = competition.platform_fee_percentage || 10; // Fallback to 10%
  const maxPrizePool = competition.max_entries * competition.entry_fee * (1 - platformFeePercentage / 100);
  const currentPrizePool = competition.prize_pool;
  const progressPercentage = Math.min((currentPrizePool / maxPrizePool) * 100, 100);

  // Determine urgency styling for days left
  const getUrgencyStyle = () => {
    const status = competition.status?.toLowerCase();
    const isClosed = status === 'closed' || status === 'judging' || status === 'complete';

    if (isClosed) return 'bg-slate-100 text-slate-700 border-slate-300';
    if (daysLeft <= 0) return 'bg-red-100 text-red-700 border-red-300'; // Deadline passed but still active
    if (daysLeft <= 3) return 'bg-red-100 text-red-700 border-red-300';
    if (daysLeft <= 7) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (daysLeft <= 14) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-brand-100 text-brand-700 border-brand-300';
  };

  const getDaysLeftText = () => {
    const status = competition.status?.toLowerCase();
    const isClosed = status === 'closed' || status === 'judging' || status === 'complete';

    if (isClosed) return 'Closed';
    if (daysLeft <= 0) return '⚠️ Deadline Passed';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  // Calculate growth stage based on entry percentage
  const fillPercentage = (competition.current_entries / competition.max_entries) * 100;
  const growthEmoji = fillPercentage < 33 ? '🌱' : fillPercentage < 66 ? '🌿' : '🌳';

  // Show "X days left" badge only if within 30 days and not passed
  const showDaysLeft = !isCompleted && !isJudging && daysLeft > 0 && daysLeft <= 30;

  return (
    <Link href={`/competitions/${competition.id}`}>
      <div className="bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 group cursor-pointer h-full flex flex-col">

        {/* Visual Header Section - Image or gradient fallback */}
        <div className="relative h-48 overflow-hidden">
          {competition.image_url ? (
            <>
              <img
                src={competition.image_url}
                alt={competition.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Overlay gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </>
          ) : (
            // Gradient fallback with plant pattern
            <div className="relative h-full bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200">
              {/* Subtle decorative plant pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 left-4 text-8xl">🌱</div>
                <div className="absolute bottom-4 right-4 text-8xl">🌿</div>
              </div>
            </div>
          )}

          {/* Growth stage indicator - on top of image/gradient */}
          <div className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <span className="text-2xl">{growthEmoji}</span>
          </div>

          {/* Days left badge - top-left (only if within 30 days) */}
          <div className="absolute top-4 left-4">
            {showDaysLeft && (
              <span className="inline-block px-3 py-1.5 bg-red-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white shadow-sm">
                {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
              </span>
            )}
          </div>

          {/* Domain tags - bottom-left (supports comma-separated domains) */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {competition.domain.split(',').map((domain, index) => (
              <span
                key={index}
                className="inline-block px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-700 shadow-sm"
              >
                {domain.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Content Section - Clean and minimal like Airbnb */}
        <div className="p-5 flex-1 flex flex-col">

          {/* Title - Bold and prominent */}
          <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {competition.title}
          </h3>

          {/* Key Info Row - Dates */}
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 mb-0.5">Opens</span>
              <span className="font-semibold text-slate-900">
                {new Date(competition.open_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-slate-500 mb-0.5">Closes</span>
              <span className="font-semibold text-slate-900">
                {new Date(competition.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Prize Pool - Keep existing but update margin */}
          <div className="flex items-center justify-between mb-3 text-sm">
            <div>
              <span className="text-slate-500">Prize Pool: </span>
              <span className="font-bold text-slate-900">{formatCurrency(competition.prize_pool)}</span>
            </div>
          </div>

          {/* Progress indicator - minimal, like Airbnb ratings */}
          {!isCompleted && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                {competition.current_entries}/{competition.max_entries} entries
              </span>
            </div>
          )}

          {/* Entry Fee - Prominent like Airbnb nightly rate */}
          {!isCompleted && (
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(competition.entry_fee)}</span>
              <span className="text-sm text-slate-500">entry</span>
            </div>
          )}

          {/* Hidden details - revealed on hover (Airbnb style) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-auto">
            <p className="text-sm text-slate-600 line-clamp-2">
              {competition.description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CompetitionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Prize Pool');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Refs for click-away behavior
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Set mounted state on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close domain dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDomainDropdownOpen && !target.closest('.relative')) {
        setIsDomainDropdownOpen(false);
      }
    };

    if (isDomainDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDomainDropdownOpen]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortDropdownOpen]);

  // Fetch competitions
  const {
    data: competitions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competitions', { search: debouncedSearch }],
    queryFn: () =>
      getCompetitions({
        search: debouncedSearch || undefined,
      }),
  });

  // Client-side domain filtering
  const filteredCompetitions = competitions?.filter(comp => {
    // If no domains selected, show all
    if (selectedDomains.length === 0) return true;

    // Check if competition has any of the selected domains
    const compDomains = comp.domain.split(',').map(d => d.trim());
    return compDomains.some(d => selectedDomains.includes(d));
  });

  // Debug logging
  useEffect(() => {
    console.log('Query state:', {
      debouncedSearch,
      selectedDomains,
      isLoading,
      competitionsCount: competitions?.length,
      filteredCount: filteredCompetitions?.length,
      error,
    });
  }, [debouncedSearch, selectedDomains, isLoading, competitions, filteredCompetitions, error]);

  console.log('Competitions data:', competitions);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate days until deadline
  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Extract unique domains dynamically from competitions (parse comma-separated domains)
  const availableDomains = competitions
    ? Array.from(
        new Set(
          competitions.flatMap(c =>
            c.domain.split(',').map(d => d.trim())
          )
        )
      ).sort()
    : [];

  // Helper function to sort competitions within a section
  const sortCompetitions = (comps: typeof competitions) => {
    if (!comps) return [];
    return [...comps].sort((a, b) => {
      if (sortBy === 'Prize Pool') {
        return b.prize_pool - a.prize_pool;
      } else if (sortBy === 'Deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      } else if (sortBy === 'Entry Fee') {
        return a.entry_fee - b.entry_fee;
      }
      return 0;
    });
  };

  // Categorize competitions by status
  const upcomingCompetitions = sortCompetitions(
    filteredCompetitions?.filter((c) => c.status?.toLowerCase() === 'upcoming')
  );
  const activeCompetitions = sortCompetitions(
    filteredCompetitions?.filter((c) => c.status?.toLowerCase() === 'active')
  );
  const judgingCompetitions = sortCompetitions(
    filteredCompetitions?.filter((c) => {
      const status = c.status?.toLowerCase();
      return status === 'closed' || status === 'judging';
    })
  );
  const completedCompetitions = sortCompetitions(
    filteredCompetitions?.filter((c) => c.status?.toLowerCase() === 'complete')
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3">
            Browse Competitions
          </h1>
          <p className="text-xl text-slate-600">
            Discover and join exciting startup competitions
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-card p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Find Your Competition</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search competitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10"
              />
              {searchTerm !== debouncedSearch && (
                <p className="text-xs text-brand-600 mt-1 flex items-center">
                  <svg
                    className="animate-spin h-3 w-3 mr-1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Searching...
                </p>
              )}
            </div>

            {/* Domain Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domains
              </label>
              {/* Dropdown Button */}
              <button
                onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                className="w-full h-10 px-4 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <span className="text-gray-700 text-sm">
                  {selectedDomains.length === 0
                    ? 'All Domains'
                    : `${selectedDomains.length} domain${selectedDomains.length > 1 ? 's' : ''} selected`
                  }
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDomainDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {/* Clear All Option */}
                  <button
                    onClick={() => {
                      setSelectedDomains([]);
                      setIsDomainDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-200"
                  >
                    All Domains
                  </button>

                  {/* Domain Checkboxes */}
                  {availableDomains.length > 0 ? (
                    availableDomains.map((domain) => (
                      <label
                        key={domain}
                        className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDomains.includes(domain)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDomains([...selectedDomains, domain]);
                            } else {
                              setSelectedDomains(selectedDomains.filter(d => d !== domain));
                            }
                          }}
                          className="mr-3 h-4 w-4 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <span className="text-sm text-gray-700">{domain}</span>
                      </label>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">No domains available</div>
                  )}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative" ref={sortDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              {/* Dropdown Button */}
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="w-full h-10 px-4 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <span className="text-gray-700 text-sm">
                  {sortBy}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isSortDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="error">
            <p className="font-semibold">Failed to load competitions</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </Alert>
        )}

        {/* Competition Sections */}
        {!isLoading && !error && (
          <div className="space-y-8">
            {/* Upcoming Competitions Section */}
            <ExpandableSection
              title="Upcoming Competitions"
              count={upcomingCompetitions.length}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingCompetitions.map((competition) => (
                  <CompetitionCard
                    key={competition.id}
                    competition={competition}
                    mounted={mounted}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getDaysUntilDeadline={getDaysUntilDeadline}
                  />
                ))}
              </div>
            </ExpandableSection>

            {/* Active Competitions Section - Most Prominent */}
            <ExpandableSection
              title="Active Competitions"
              count={activeCompetitions.length}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCompetitions.map((competition) => (
                  <CompetitionCard
                    key={competition.id}
                    competition={competition}
                    mounted={mounted}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getDaysUntilDeadline={getDaysUntilDeadline}
                  />
                ))}
              </div>
            </ExpandableSection>

            {/* Judging Competitions Section */}
            <ExpandableSection
              title="Closed & Judging"
              count={judgingCompetitions.length}
              defaultExpanded={false}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {judgingCompetitions.map((competition) => (
                  <CompetitionCard
                    key={competition.id}
                    competition={competition}
                    mounted={mounted}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getDaysUntilDeadline={getDaysUntilDeadline}
                    isJudging={true}
                  />
                ))}
              </div>
            </ExpandableSection>

            {/* Completed Competitions Section */}
            <ExpandableSection
              title="Completed Competitions"
              count={completedCompetitions.length}
              defaultExpanded={false}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCompetitions.map((competition) => (
                  <CompetitionCard
                    key={competition.id}
                    competition={competition}
                    mounted={mounted}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getDaysUntilDeadline={getDaysUntilDeadline}
                    isCompleted={true}
                  />
                ))}
              </div>
            </ExpandableSection>
          </div>
        )}
      </div>
    </div>
  );
}
