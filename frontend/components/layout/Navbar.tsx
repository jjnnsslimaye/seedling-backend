'use client';

/**
 * Navigation bar component with authentication-aware menu
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProfileDropdown from './ProfileDropdown';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Lottie from 'lottie-react';
import seedlingAnimation from '@/public/seedling-animation.json';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch user avatar URL
  const { data: avatarData } = useQuery({
    queryKey: ['user-avatar', user?.id],
    queryFn: async () => {
      const response = await api.get('/users/me/avatar-url');
      return response.data;
    },
    enabled: !!user?.id && isAuthenticated,
  });

  function handleLogout() {
    logout();
    router.push('/');
    setMobileMenuOpen(false);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  // Get user initials
  const initials = user?.username?.slice(0, 2).toUpperCase() ||
                   user?.email?.slice(0, 2).toUpperCase() ||
                   'U';

  // Navigation links based on authentication and role
  const getNavigationLinks = () => {
    if (!isAuthenticated) {
      return [
        { href: '/competitions', label: 'Browse Competitions' },
        { href: '/login', label: 'Login' },
        { href: '/register', label: 'Register' },
      ];
    }

    if (isRole('admin')) {
      return [
        { href: '/competitions', label: 'Browse' },
        { href: '/admin', label: 'Manage Competitions' },
        { href: '/admin/competitions/create', label: 'Create Competition' },
        { href: '/admin/users', label: 'Manage Users' },
      ];
    }

    if (isRole('judge')) {
      return [
        { href: '/competitions', label: 'Browse' },
        { href: '/judge/dashboard', label: 'My Assignments' },
      ];
    }

    // founder role
    return [
      { href: '/competitions', label: 'Browse' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/payouts', label: 'Payouts' },
    ];
  };

  const navigationLinks = getNavigationLinks();

  return (
    <nav className="sticky top-0 z-50 bg-slate-50 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex-shrink-0 flex items-center gap-2"
              onClick={closeMobileMenu}
            >
              <div className="w-8 h-8">
                <Lottie
                  animationData={seedlingAnimation}
                  loop={false}
                  autoplay={false}
                  initialSegment={[89, 90]}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <span className="text-2xl font-extrabold text-brand-600 tracking-tight">
                Seedling
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-700 hover:text-brand-700 hover:bg-brand-50 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}

            {/* User Profile Dropdown (Desktop) */}
            {isAuthenticated && (
              <div className="ml-4 pl-4 border-l border-gray-200">
                <ProfileDropdown />
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-brand-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                // Hamburger icon
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                // Close icon
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-50 border-t border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="block text-slate-700 hover:text-brand-700 hover:bg-brand-50 px-4 py-2.5 rounded-2xl text-base font-semibold transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}

            {/* User Info and Logout (Mobile) */}
            {isAuthenticated && (
              <div className="border-t border-slate-200 pt-4 pb-3">
                <div className="px-3 mb-3 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                    {avatarData?.avatar_url ? (
                      <img src={avatarData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  {/* User Info */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      Role: {user?.role}
                    </p>
                  </div>
                </div>

                {/* Mobile Menu Links */}
                <div className="space-y-1 px-3 mb-3">
                  <Link
                    href="/profile"
                    onClick={closeMobileMenu}
                    className="block text-slate-700 hover:text-brand-700 hover:bg-brand-50 px-4 py-2.5 rounded-2xl text-base font-semibold transition-colors duration-200"
                  >
                    Profile
                  </Link>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-[calc(100%-1.5rem)] mx-3 text-left block bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
