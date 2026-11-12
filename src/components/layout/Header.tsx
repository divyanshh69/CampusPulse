import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, ChevronDown, UserCircle, Settings, LogOut } from 'lucide-react';
import { PageRoute } from '../../types';
import { useClubStore } from '../../hooks/useClubStore';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

const PAGE_TITLES: Record<PageRoute, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'Dashboard', breadcrumb: 'Club Overview / Fall 2026' },
  members: { title: 'Members Directory', breadcrumb: 'Organization / Roster' },
  events: { title: 'Events & Workshops', breadcrumb: 'Programming / Schedule' },
  attendance: { title: 'Attendance Tracker', breadcrumb: 'Operations / Check-In' },
  credits: { title: 'Credits & Leaderboard', breadcrumb: 'Recognition / Ledger' },
  tasks: { title: 'Task Board', breadcrumb: 'Deliverables / Assignments' },
  profile: { title: 'Member Profile', breadcrumb: 'Account / Personal Record' },
  settings: { title: 'Platform Settings', breadcrumb: 'Administration / Configuration' },
  login: { title: 'Sign In', breadcrumb: 'Authentication' },
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    currentPage,
    setCurrentPage,
    currentUser,
    activities,
    logout,
    setViewingMember,
  } = useClubStore();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard;
  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Left Zone: Mobile Menu Trigger + Page Title & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation sidebar"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="hidden sm:block text-[11px] text-slate-400">
            {meta.breadcrumb}
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 font-display truncate">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Right Zone: Notifications & User Profile Menu */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileMenuOpen(false);
            }}
            aria-label="View club notifications"
            aria-expanded={isNotificationsOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications ({activities.length})</span>
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg p-4 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-semibold text-slate-900">
                  Recent Club Notifications
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {activities.slice(0, 4).length} updates
                </span>
              </div>
              <ul className="mt-2 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {activities.slice(0, 4).map((act) => (
                  <li key={act.id} className="py-2.5 text-xs">
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {act.actorName}
                      </span>{' '}
                      {act.action.toLowerCase()}{' '}
                      <span className="font-medium text-slate-900">
                        {act.target}
                      </span>
                    </p>
                    <span className="mt-0.5 block text-[11px] text-slate-400 font-mono">
                      {act.timestamp}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen((prev) => !prev);
              setIsNotificationsOpen(false);
            }}
            aria-label="Open user profile menu"
            aria-expanded={isProfileMenuOpen}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white font-mono">
              {initials}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight whitespace-nowrap">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight whitespace-nowrap">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-3 z-50">
              <div className="border-b border-slate-100 px-2 pb-2.5">
                <div className="text-xs font-semibold text-slate-900">
                  {currentUser.name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {currentUser.email}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {currentUser.role} · {currentUser.department}
                </div>
              </div>

              <div className="pt-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewingMember(null);
                    setCurrentPage('profile');
                    setIsProfileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <UserCircle className="h-3.5 w-3.5 text-slate-500" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage('settings');
                    setIsProfileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  <span>Platform Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
