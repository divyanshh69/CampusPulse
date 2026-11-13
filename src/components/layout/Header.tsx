import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Menu,
  ChevronDown,
  UserCircle,
  Settings,
  LogOut,
  Calendar,
  Ticket,
  CheckSquare,
  Award,
  UserCheck,
  CheckCheck,
} from 'lucide-react';
import { PageRoute, NotificationType, Notification } from '../../types';
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
  notifications: { title: 'Notifications', breadcrumb: 'Inbox / In-App Alerts' },
  login: { title: 'Sign In', breadcrumb: 'Authentication' },
};

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'EVENT':
      return <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    case 'REGISTRATION':
      return <Ticket className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    case 'TASK':
      return <CheckSquare className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    case 'CREDIT':
      return <Award className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
    case 'ATTENDANCE':
      return <UserCheck className="h-3.5 w-3.5 text-teal-500 shrink-0" />;
    case 'SYSTEM':
    default:
      return <Bell className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
  }
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    currentPage,
    setCurrentPage,
    currentUser,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
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

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    setIsNotificationsOpen(false);

    // Route to relevant module page
    if (notif.type === 'EVENT' || notif.type === 'REGISTRATION') {
      setCurrentPage('events');
    } else if (notif.type === 'TASK') {
      setCurrentPage('tasks');
    } else if (notif.type === 'CREDIT') {
      setCurrentPage('credits');
    } else if (notif.type === 'ATTENDANCE') {
      setCurrentPage('attendance');
    }
  };

  const meta = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard;
  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const recentNotifications = notifications.slice(0, 5);

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
        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileMenuOpen(false);
            }}
            aria-label="View notifications"
            aria-expanded={isNotificationsOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white font-mono animate-pulse">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
            <span className="sr-only">Notifications ({unreadNotificationCount} unread)</span>
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Notifications
                  </span>
                  {unreadNotificationCount > 0 && (
                    <span className="rounded-full bg-red-100 text-red-700 px-1.5 py-0.2 text-[10px] font-semibold font-mono">
                      {unreadNotificationCount} unread
                    </span>
                  )}
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead()}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {recentNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Bell className="h-7 w-7 mx-auto text-slate-300 mb-2" />
                  <span>No notifications yet</span>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {recentNotifications.map((notif) => (
                    <li
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                        notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                      }`}
                    >
                      <div className="mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900 truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-slate-600 line-clamp-2 leading-relaxed text-[11px]">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-slate-100 p-2.5 bg-slate-50/70 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage('notifications');
                    setIsNotificationsOpen(false);
                  }}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer w-full py-1"
                >
                  View all notifications →
                </button>
              </div>
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
