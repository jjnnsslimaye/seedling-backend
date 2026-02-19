'use client';

/**
 * Professional profile dropdown menu component
 */

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ProfileDropdown() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Fetch user avatar URL
  const { data: avatarData } = useQuery({
    queryKey: ['user-avatar', user?.id],
    queryFn: async () => {
      const response = await api.get('/users/me/avatar-url');
      return response.data;
    },
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'judge':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'founder':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) return null;

  // Get user initials
  const initials = user?.username?.slice(0, 2).toUpperCase() ||
                   user?.email?.slice(0, 2).toUpperCase() ||
                   'U';

  return (
    <Menu as="div" className="relative inline-block text-left">
      {/* Profile Button */}
      <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500">
        {/* Avatar Circle */}
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold overflow-hidden">
          {avatarData?.avatar_url ? (
            <img src={avatarData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {/* Username - Desktop only */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">
            {user?.username}
          </p>
        </div>

        {/* Chevron Icon */}
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </Menu.Button>

      {/* Dropdown Menu */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg focus:outline-none z-50 overflow-hidden">
          <div className="py-1">
            {/* Profile Section */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                  {avatarData?.avatar_url ? (
                    <img src={avatarData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 capitalize ${getRoleBadgeColor(user?.role || '')}`}>
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/profile"
                    className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors duration-200 ${
                      active
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Edit Profile
                  </Link>
                )}
              </Menu.Item>
            </div>

            {/* Sign Out */}
            <div className="py-1 border-t border-gray-100">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors duration-200 ${
                      active
                        ? 'bg-red-50 text-red-700'
                        : 'text-red-600'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
