'use client';

import { useState } from 'react';

interface ExpandableSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badgeColor?: 'blue' | 'green' | 'purple' | 'gray';
  isExpanded?: boolean;
  onToggle?: () => void;
  emptyMessage?: string;
}

export function ExpandableSection({
  title,
  count,
  children,
  defaultExpanded = true,
  badgeColor = 'green',
  isExpanded: controlledIsExpanded,
  onToggle,
  emptyMessage
}: ExpandableSectionProps) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded);
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  // Define color classes based on badgeColor prop
  const getHoverColors = () => {
    switch (badgeColor) {
      case 'purple':
        return {
          titleHover: 'group-hover:text-purple-600',
          badgeBgHover: 'group-hover:bg-purple-100',
          badgeTextHover: 'group-hover:text-purple-700',
          chevronHover: 'group-hover:text-purple-600',
        };
      case 'blue':
        return {
          titleHover: 'group-hover:text-blue-600',
          badgeBgHover: 'group-hover:bg-blue-100',
          badgeTextHover: 'group-hover:text-blue-700',
          chevronHover: 'group-hover:text-blue-600',
        };
      case 'gray':
        return {
          titleHover: 'group-hover:text-gray-600',
          badgeBgHover: 'group-hover:bg-gray-100',
          badgeTextHover: 'group-hover:text-gray-700',
          chevronHover: 'group-hover:text-gray-600',
        };
      default: // green/brand
        return {
          titleHover: 'group-hover:text-brand-600',
          badgeBgHover: 'group-hover:bg-brand-100',
          badgeTextHover: 'group-hover:text-brand-700',
          chevronHover: 'group-hover:text-brand-600',
        };
    }
  };

  const colors = getHoverColors();

  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden mb-6 border border-slate-100">
      {/* Header Button */}
      <button
        onClick={handleToggle}
        className="w-full group"
      >
        <div className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors duration-200">

          {/* Left: Title */}
          <h2 className={`text-2xl font-bold text-slate-900 ${colors.titleHover} transition-colors duration-200`}>
            {title}
          </h2>

          {/* Right: Count + Chevron */}
          <div className="flex items-center gap-4">
            {count !== undefined && (
              <span className={`bg-slate-100 ${colors.badgeBgHover} text-slate-700 ${colors.badgeTextHover} px-4 py-2 rounded-full text-sm font-bold transition-all duration-200`}>
                {count}
              </span>
            )}

            <svg
              className={`w-6 h-6 text-slate-400 ${colors.chevronHover} transition-all duration-300 ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Divider - only show when expanded */}
      {isExpanded && (
        <div className="border-t border-slate-100" />
      )}

      {/* Content Area - Cards Container */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6">
          {count === 0 && emptyMessage ? (
            <div className="text-center py-8 text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
