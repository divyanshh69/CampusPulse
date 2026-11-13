import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  Ticket,
  CheckSquare,
  Award,
  UserCheck,
  Check,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NotificationType, Notification } from '../types';
import { useClubStore } from '../hooks/useClubStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

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
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getNotificationVisuals(type: NotificationType) {
  switch (type) {
    case 'EVENT':
      return {
        icon: <Calendar className="h-4 w-4 text-blue-600" />,
        badge: <Badge tone="info">Event</Badge>,
        bg: 'bg-blue-50 border-blue-200/60',
      };
    case 'REGISTRATION':
      return {
        icon: <Ticket className="h-4 w-4 text-emerald-600" />,
        badge: <Badge tone="success">RSVP</Badge>,
        bg: 'bg-emerald-50 border-emerald-200/60',
      };
    case 'TASK':
      return {
        icon: <CheckSquare className="h-4 w-4 text-amber-600" />,
        badge: <Badge tone="warning">Task</Badge>,
        bg: 'bg-amber-50 border-amber-200/60',
      };
    case 'CREDIT':
      return {
        icon: <Award className="h-4 w-4 text-purple-600" />,
        badge: <Badge tone="success">Credit</Badge>,
        bg: 'bg-purple-50 border-purple-200/60',
      };
    case 'ATTENDANCE':
      return {
        icon: <UserCheck className="h-4 w-4 text-teal-600" />,
        badge: <Badge tone="info">Attendance</Badge>,
        bg: 'bg-teal-50 border-teal-200/60',
      };
    case 'SYSTEM':
    default:
      return {
        icon: <Bell className="h-4 w-4 text-slate-600" />,
        badge: <Badge tone="neutral">System</Badge>,
        bg: 'bg-slate-50 border-slate-200/60',
      };
  }
}

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadNotificationCount,
    isLoadingNotifications,
    notificationsError,
    notificationsPagination,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    setCurrentPage,
  } = useClubStore();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [operatingId, setOperatingId] = useState<string | null>(null);

  // Fetch notifications on mount and when filter criteria change
  useEffect(() => {
    fetchNotifications({
      page: currentPageNum,
      limit: 20,
      unreadOnly: statusFilter === 'UNREAD',
      type: typeFilter !== 'ALL' ? typeFilter : undefined,
    });
  }, [fetchNotifications, currentPageNum, statusFilter, typeFilter]);

  const handleMarkRead = async (id: string) => {
    setOperatingId(id);
    try {
      await markNotificationAsRead(id);
    } finally {
      setOperatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setOperatingId(id);
    try {
      await deleteNotification(id);
    } finally {
      setOperatingId(null);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
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

  const categories: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All Categories' },
    { key: 'EVENT', label: 'Events' },
    { key: 'REGISTRATION', label: 'RSVPs' },
    { key: 'TASK', label: 'Tasks' },
    { key: 'CREDIT', label: 'Credits' },
    { key: 'ATTENDANCE', label: 'Attendance' },
    { key: 'SYSTEM', label: 'System' },
  ];

  // In-memory read/unread filter for 'READ' view if not querying backend unreadOnly
  const displayedNotifications = notifications.filter((n) => {
    if (statusFilter === 'READ') return n.isRead;
    if (statusFilter === 'UNREAD') return !n.isRead;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Zone */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 font-display">
              In-App Notifications
            </h2>
            {unreadNotificationCount > 0 && (
              <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-semibold font-mono">
                {unreadNotificationCount} unread
              </span>
            )}
            {isLoadingNotifications && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Real-time notifications for event programming, task assignments, credits, and announcements.
          </p>
        </div>

        {unreadNotificationCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllNotificationsAsRead()}
            className="text-slate-700 hover:text-slate-900"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1 text-slate-500" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {notificationsError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{notificationsError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications()}
            className="border-red-300 text-red-800 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Read / Unread Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPageNum(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Notifications
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('UNREAD');
                setCurrentPageNum(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'UNREAD'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unread</span>
              {unreadNotificationCount > 0 && (
                <span className="rounded-full bg-red-600 text-white px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('READ');
                setCurrentPageNum(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'READ'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Read
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by notification category"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPageNum(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <span className="font-mono tabular-nums">
            Showing {displayedNotifications.length} of {notificationsPagination.total} notifications
          </span>
          {(statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setCurrentPageNum(1);
              }}
              className="text-slate-600 underline hover:text-slate-900 cursor-pointer"
            >
              Reset active filters
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {isLoadingNotifications && displayedNotifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 rounded-xl border border-slate-200 bg-white p-4 animate-pulse flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-lg bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Bell className="h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 font-display">
            No notifications found
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {statusFilter === 'UNREAD'
              ? 'You are all caught up! No unread notifications.'
              : 'You have no notifications matching your current filter criteria.'}
          </p>
          {(statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setCurrentPageNum(1);
              }}
              className="mt-4"
            >
              Reset All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedNotifications.map((notif) => {
            const visual = getNotificationVisuals(notif.type);
            const isOperating = operatingId === notif.id;

            return (
              <div
                key={notif.id}
                className={`card-base p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  notif.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/20 border-blue-200 shadow-2xs'
                }`}
              >
                <div
                  className="flex items-start gap-3 min-w-0 cursor-pointer flex-1"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 ${visual.bg}`}
                  >
                    {visual.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold ${
                          notif.isRead ? 'text-slate-800' : 'text-slate-900 font-bold'
                        }`}
                      >
                        {notif.title}
                      </span>
                      {visual.badge}
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-slate-400 font-mono">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                  {!notif.isRead && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isOperating}
                      onClick={() => handleMarkRead(notif.id)}
                      className="text-slate-700"
                    >
                      <Check className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      <span>Mark Read</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isOperating}
                    onClick={() => handleDelete(notif.id)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {notificationsPagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
          <span>
            Page {notificationsPagination.page} of {notificationsPagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPageNum <= 1 || isLoadingNotifications}
              onClick={() => setCurrentPageNum((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                currentPageNum >= notificationsPagination.totalPages ||
                isLoadingNotifications
              }
              onClick={() =>
                setCurrentPageNum((prev) =>
                  Math.min(notificationsPagination.totalPages, prev + 1)
                )
              }
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

