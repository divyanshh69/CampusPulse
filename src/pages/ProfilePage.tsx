import React from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useClubStore } from '../hooks/useClubStore';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { TaskStatus } from '../types';

export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    viewingMember,
    setViewingMember,
    setCurrentPage,
    attendance,
    events,
    credits,
    tasks,
    changeTaskStatus,
  } = useClubStore();

  const profileUser = viewingMember || currentUser;
  const isViewingSelf = !viewingMember || viewingMember.id === currentUser.id;

  const initials = profileUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const memberAttendanceRecords = attendance.filter(
    (r) => r.memberId === profileUser.id
  );

  const memberCredits = credits.filter((c) => c.memberId === profileUser.id);
  const memberTasks = tasks.filter((t) => t.assignedToId === profileUser.id);

  const completedTasksCount = memberTasks.filter(
    (t) => t.status === 'Completed'
  ).length;

  const canEditTasks =
    isViewingSelf ||
    currentUser.role === 'Admin' ||
    (currentUser.role === 'Department Head' &&
      currentUser.department === profileUser.department);

  return (
    <div className="space-y-6">
      {/* Back to Members Banner if inspecting someone else */}
      {!isViewingSelf && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewingMember(null);
                setCurrentPage('members');
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Members Directory
            </Button>
            <span className="text-xs text-slate-500">
              Viewing profile for{' '}
              <strong className="text-slate-900">{profileUser.name}</strong>
            </span>
          </div>
          <Badge
            tone={
              profileUser.role === 'Admin'
                ? 'brand'
                : profileUser.role === 'Department Head'
                ? 'info'
                : 'neutral'
            }
          >
            {profileUser.role}
          </Badge>
        </div>
      )}

      {/* Member Identity Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white font-mono">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  {profileUser.name}
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  ({profileUser.studentId})
                </span>
                <Badge
                  tone={
                    profileUser.role === 'Admin'
                      ? 'brand'
                      : profileUser.role === 'Department Head'
                      ? 'info'
                      : 'neutral'
                  }
                >
                  {profileUser.role}
                </Badge>
                <Badge
                  tone={
                    profileUser.status === 'Active'
                      ? 'success'
                      : profileUser.status === 'Probation'
                      ? 'warning'
                      : 'neutral'
                  }
                  withDot
                >
                  {profileUser.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-800">
                  {profileUser.department}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {profileUser.academicYear} ({profileUser.major})
                </span>
                <span aria-hidden="true">·</span>
                <span>Joined {profileUser.joinedDate}</span>
              </div>
              {profileUser.bio && (
                <p className="mt-2 text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {profileUser.bio}
                </p>
              )}
            </div>
          </div>

          {/* Session / Verification Status */}
          <div className="shrink-0 flex items-center">
            {isViewingSelf ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Active Authenticated Session
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                Verified Student Record
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Personal KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Attendance Rate"
          value={`${profileUser.attendancePercentage}%`}
          delta={
            profileUser.attendancePercentage >= 85
              ? 'Good Standing'
              : 'Below 85% Target'
          }
          deltaTone={
            profileUser.attendancePercentage >= 85 ? 'positive' : 'warning'
          }
          subtext={`${memberAttendanceRecords.length} logged sessions`}
        />
        <StatCard
          label="Total Merit Credits"
          value={`${profileUser.totalCredits} cr`}
          delta="Accumulated"
          deltaTone="positive"
          subtext={`${memberCredits.length} credit transactions`}
        />
        <StatCard
          label="Assigned Tasks"
          value={memberTasks.length}
          delta={`${completedTasksCount} completed`}
          subtext="Department deliverables"
        />
        <StatCard
          label="University Email"
          value={profileUser.email.split('@')[0]}
          subtext={profileUser.email}
        />
      </div>

      {/* Two-Column Detail View: Attendance & Credit History + Assigned Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left 6 Cols: Assigned Tasks & Attendance History */}
        <div className="lg:col-span-6 space-y-6">
          {/* Assigned Tasks */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Assigned Tasks ({memberTasks.length})
              </h3>
              <p className="text-xs text-slate-500">
                Club deliverables and operational responsibilities
              </p>
            </div>

            {memberTasks.length === 0 ? (
              <div className="p-6 text-xs text-slate-500 text-center">
                No tasks currently assigned to {profileUser.name}.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {memberTasks.map((task) => (
                  <li key={task.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">
                          {task.title}
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                          {task.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Priority: {task.priority}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">Due {task.deadline}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-medium text-slate-700">+{task.creditValue} cr</span>
                        </div>
                      </div>

                      {canEditTasks ? (
                        <select
                          aria-label={`Update task status for ${task.title}`}
                          value={task.status}
                          onChange={(e) =>
                            changeTaskStatus(
                              task.id,
                              e.target.value as TaskStatus
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none shrink-0 cursor-pointer"
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Completed">Completed</option>
                        </select>
                      ) : (
                        <Badge
                          tone={
                            task.status === 'Completed'
                              ? 'success'
                              : task.status === 'In Progress'
                              ? 'info'
                              : task.status === 'Under Review'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {task.status}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Event Attendance Record */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Attendance Log & Event Check-ins
              </h3>
              <p className="text-xs text-slate-500">
                Official attendance records for club sessions
              </p>
            </div>

            {memberAttendanceRecords.length === 0 ? (
              <div className="p-6 text-xs text-slate-500 text-center">
                No individual session records logged yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
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
                      <Badge tone={tone} withDot>{rec.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right 6 Cols: Credit History */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              Merit Credit Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail of points awarded or adjusted
            </p>
          </div>

          {memberCredits.length === 0 ? (
            <div className="p-6 text-xs text-slate-500 text-center">
              No recent credit transactions recorded for {profileUser.name}. Base semester balance: {profileUser.totalCredits} cr.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
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
