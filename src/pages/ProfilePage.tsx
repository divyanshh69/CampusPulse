import React from 'react';
import { useClubStore } from '../hooks/useClubStore';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { TaskStatus } from '../types';

export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    attendance,
    events,
    credits,
    tasks,
    changeTaskStatus,
  } = useClubStore();

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const memberAttendanceRecords = attendance.filter(
    (r) => r.memberId === currentUser.id
  );

  const memberCredits = credits.filter((c) => c.memberId === currentUser.id);
  const memberTasks = tasks.filter((t) => t.assignedToId === currentUser.id);

  const completedTasksCount = memberTasks.filter(
    (t) => t.status === 'Completed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Member Identity Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white font-mono">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  {currentUser.name}
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  ({currentUser.studentId})
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">
                  {currentUser.role}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentUser.department}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {currentUser.academicYear} ({currentUser.major})
                </span>
                <span aria-hidden="true">·</span>
                <span>Joined {currentUser.joinedDate}</span>
              </div>
              {currentUser.bio && (
                <p className="mt-2 text-xs text-slate-600 max-w-2xl">
                  {currentUser.bio}
                </p>
              )}
            </div>
          </div>

          {/* Verified Session Indicator */}
          <div className="shrink-0 flex items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Authenticated Session
            </span>
          </div>
        </div>
      </div>

      {/* Personal KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Attendance Rate"
          value={`${currentUser.attendancePercentage}%`}
          delta={
            currentUser.attendancePercentage >= 85
              ? 'Good Standing'
              : 'Below 85% Target'
          }
          deltaTone={
            currentUser.attendancePercentage >= 85 ? 'positive' : 'warning'
          }
          subtext={`${memberAttendanceRecords.length} logged event sessions`}
        />
        <StatCard
          label="Total Merit Credits"
          value={`${currentUser.totalCredits} cr`}
          delta="Active Semester"
          deltaTone="positive"
          subtext={`${memberCredits.length} recorded transactions`}
        />
        <StatCard
          label="Assigned Tasks"
          value={memberTasks.length}
          delta={`${completedTasksCount} completed`}
          subtext="Departmental deliverables"
        />
        <StatCard
          label="Membership Status"
          value={currentUser.status}
          delta="SSO Verified"
          deltaTone="positive"
          subtext={currentUser.email}
        />
      </div>

      {/* Two-Column Detail View: Attendance & Credit History + Assigned Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left 6 Cols: Assigned Tasks & Attendance History */}
        <div className="lg:col-span-6 space-y-6">
          {/* Assigned Tasks */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Assigned Tasks ({memberTasks.length})
              </h3>
              <p className="text-xs text-slate-500">
                Personal deliverables and current completion status
              </p>
            </div>

            {memberTasks.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">
                No tasks currently assigned to {currentUser.name}.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/80">
                {memberTasks.map((task) => (
                  <li key={task.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">
                          {task.title}
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {task.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Priority: {task.priority}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">Due {task.deadline}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">+{task.creditValue} cr</span>
                        </div>
                      </div>

                      <select
                        aria-label={`Update task status for ${task.title}`}
                        value={task.status}
                        onChange={(e) =>
                          changeTaskStatus(
                            task.id,
                            e.target.value as TaskStatus
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none shrink-0"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Event Attendance Record */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Attendance Statistics & Session Log
              </h3>
              <p className="text-xs text-slate-500">
                Verified check-ins for club events
              </p>
            </div>

            {memberAttendanceRecords.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">
                No individual session records logged yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/80">
                {memberAttendanceRecords.map((rec) => {
                  const evt = events.find((e) => e.id === rec.eventId);
                  const tone =
                    rec.status === 'Present'
                      ? 'success'
                      : rec.status === 'Excused'
                      ? 'warning'
                      : 'danger';
                  return (
                    <li
                      key={rec.id}
                      className="flex items-center justify-between px-5 py-3.5 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {evt ? evt.title : rec.eventId}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Marked {rec.markedAt} by {rec.markedBy}
                        </div>
                      </div>
                      <Badge tone={tone}>{rec.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right 6 Cols: Credit History */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              Personal Credit History
            </h3>
            <p className="text-xs text-slate-500">
              Itemized breakdown of merit points earned or deducted
            </p>
          </div>

          {memberCredits.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">
              No recent credit transactions recorded for {currentUser.name} in the current log window. Base semester balance: {currentUser.totalCredits} cr.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/80">
              {memberCredits.map((tx) => {
                const isPos = tx.delta >= 0;
                return (
                  <li key={tx.id} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {tx.category}
                      </span>
                      <Badge
                        tone={isPos ? 'success' : 'danger'}
                        className="font-mono tabular-nums"
                      >
                        {isPos ? `+${tx.delta} cr` : `${tx.delta} cr`}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-700">{tx.reason}</p>
                    <div className="mt-1 text-[11px] text-slate-400 font-mono">
                      {tx.timestamp} · Issued by {tx.issuedBy}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
