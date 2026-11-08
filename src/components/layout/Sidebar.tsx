import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCheck,
  Award,
  CheckSquare,
  UserCircle,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { PageRoute } from '../../types';
import { useClubStore } from '../../hooks/useClubStore';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: PageRoute;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance', icon: UserCheck },
  { id: 'credits', label: 'Credits', icon: Award },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentPage, setCurrentPage, currentUser, logout } = useClubStore();

  const handleNavigate = (page: PageRoute) => {
    setCurrentPage(page);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Club navigation sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:flex ${
          isOpenMobile ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-slate-900 rounded cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white font-mono">
              CP
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 font-display whitespace-nowrap">
              CampusPulse
            </span>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Role & Sign Out Footer */}
        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="px-1">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {currentUser.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <span>{currentUser.role}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{currentUser.department}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" />
            <span>Sign Out to Login Screen</span>
          </button>
        </div>
      </aside>
    </>
  );
};
