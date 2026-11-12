import React from 'react';
import {
  UserPlus,
  CalendarPlus,
  UserCheck,
  Award,
  ArrowRight,
} from 'lucide-react';
import { useClubStore } from '../hooks/useClubStore';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    metrics,
    events,
    activities,
    departments,
    tasks,
    setCurrentPage,
  } = useClubStore();

  const upcomingEvents = events.filter(
    (e) => e.status === 'Upcoming' || e.status === 'Ongoing'
  );

  const pendingTasksCount = tasks.filter(
    (t) => t.status !== 'Completed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Welcome back, {currentUser.name}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Active Role: <span className="font-semibold text-slate-900">{currentUser.role}</span> · Department: <span className="font-semibold text-slate-900">{currentUser.department}</span> · {pendingTasksCount} open tasks across club
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={() => setCurrentPage('attendance')}
          >
            <UserCheck className="h-4 w-4" />
            <span>Take Attendance</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setCurrentPage('events')}
          >
            <CalendarPlus className="h-4 w-4" />
            <span>Schedule Event</span>
          </Button>
        </div>
      </div>

      {/* 4 Core KPI Stat Cards */}
      <section aria-label="Key club metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Members"
          value={metrics.totalMembers}
          delta={`${metrics.activeMembers} active`}
          deltaTone="positive"
          subtext={`Across ${departments.length} club departments`}
        />
        <StatCard
          label="Upcoming Events"
          value={metrics.upcomingEventsCount}
          delta={metrics.upcomingEventsCount > 0 ? `${metrics.upcomingEventsCount} scheduled` : 'None pending'}
          deltaTone={metrics.upcomingEventsCount > 0 ? 'positive' : 'neutral'}
          subtext="Workshops, mixers & sessions"
        />
        <StatCard
          label="Average Attendance"
          value={`${metrics.averageAttendance}%`}
          delta="Target: 85%"
          deltaTone={metrics.averageAttendance >= 85 ? 'positive' : 'warning'}
          subtext="Club-wide semester participation"
        />
        <StatCard
          label="Credits Distributed"
          value={`${metrics.totalCreditsDistributed.toLocaleString()} cr`}
          delta="Merit ledger"
          deltaTone="positive"
          subtext="Recognized contributions"
        />
      </section>

      {/* Quick Actions Strip */}
      <section aria-label="Quick operations" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              Quick Operations
            </h3>
            <p className="text-xs text-slate-500">
              {currentUser.role === 'Member'
                ? 'Quickly jump to your profile, assigned tasks, or explore upcoming club events.'
                : 'Directly manage member rosters, record event check-ins, award credits, or assign tasks.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentUser.role !== 'Member' ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage('members')}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Member</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage('attendance')}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Mark Roster</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage('credits')}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Award Credits</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage('tasks')}
                >
                  <span>Manage Tasks</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage('profile')}
                >
                  <span>My Profile</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage('tasks')}
                >
                  <span>My Tasks</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage('events')}
                >
                  <span>Browse Events</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Two-Column Grid: Upcoming Events & Recent Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left 7 Cols: Upcoming Events */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Upcoming Events
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled club sessions and expected turnout
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('events')}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              <span>View all events</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-200/80">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Badge tone="info">{evt.status}</Badge>
                    <span aria-hidden="true">·</span>
                    <span>{evt.department}</span>
                    {evt.mandatory && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-amber-700">
                          Mandatory
                        </span>
                      </>
                    )}
                  </div>
                  <h4 className="mt-1 text-sm font-semibold text-slate-900 truncate">
                    {evt.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {evt.location} · <span className="font-mono">{evt.date} ({evt.time})</span>
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <span className="text-xs font-mono tabular-nums text-slate-700">
                    {evt.participantCount} / {evt.capacity} registered
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('attendance')}
                    className="text-xs font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600 cursor-pointer"
                  >
                    Open Check-In
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right 5 Cols: Recent Activities */}
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Recent Activities
              </h3>
              <p className="text-xs text-slate-500">
                Live audit trail across departments
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {activities.length} entries
            </span>
          </div>

          <ul className="divide-y divide-slate-200/80">
            {activities.slice(0, 6).map((act) => (
              <li key={act.id} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {act.actorName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {act.timestamp}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  {act.action}{' '}
                  <span className="font-medium text-slate-900">
                    {act.target}
                  </span>
                </p>
                <div className="mt-1 text-[11px] text-slate-400">
                  Role: {act.actorRole} · Category: {act.category}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Departments Summary Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              Club Departments & Leads
            </h3>
            <p className="text-xs text-slate-500">
              Organizational units and assigned Department Heads
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('members')}
          >
            Filter Roster by Department
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Department
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Department Head
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Focus Area
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600">
                  Active Members
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-500">
                    {dept.code}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {dept.name}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-700">
                    {dept.headName}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-md truncate">
                    {dept.description}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                    {dept.memberCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
