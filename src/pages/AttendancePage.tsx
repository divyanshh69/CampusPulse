import React, { useState, useMemo, useEffect } from 'react';
import { CheckCheck, AlertTriangle } from 'lucide-react';
import { AttendanceStatus, DepartmentName } from '../types';
import { ALL_DEPARTMENTS, useClubStore } from '../hooks/useClubStore';
import { getEventAttendanceSummary, canManageDepartment } from '../utils/clubLogic';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Modal } from '../components/ui/Modal';

export const AttendancePage: React.FC = () => {
  const {
    currentUser,
    events,
    members,
    attendance,
    markAttendance,
    markAllPresentForEvent,
  } = useClubStore();

  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [deptFilter, setDeptFilter] = useState<DepartmentName | 'All'>('All');
  const [isConfirmAllOpen, setIsConfirmAllOpen] = useState(false);

  useEffect(() => {
    if (events.length > 0 && (!selectedEventId || !events.some((e) => e.id === selectedEventId))) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent =
    events.find((e) => e.id === selectedEventId) || events[0] || {
      id: '',
      title: 'No Event',
      date: '',
      time: '',
      location: '',
      status: 'Upcoming',
      department: 'Technical & Engineering',
      creditReward: 0,
    };

  const summary = useMemo(
    () => (selectedEvent.id ? getEventAttendanceSummary(attendance, members, selectedEvent.id) : {
      presentRate: 0,
      presentCount: 0,
      excusedCount: 0,
      absentCount: 0,
      totalMarked: 0,
    }),
    [attendance, members, selectedEvent.id]
  );

  const visibleMembers = useMemo(
    () =>
      members.filter(
        (m) => deptFilter === 'All' || m.department === deptFilter
      ),
    [members, deptFilter]
  );

  const hasEditAccess = canManageDepartment(
    currentUser,
    selectedEvent.department
  );

  const getMemberStatus = (memberId: string): AttendanceStatus => {
    const rec = attendance.find(
      (r) => r.eventId === selectedEvent.id && r.memberId === memberId
    );
    return rec ? rec.status : 'Present';
  };

  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleConfirmMarkAll = async () => {
    if (selectedEvent.id) {
      setIsMarkingAll(true);
      try {
        await markAllPresentForEvent(selectedEvent.id);
      } catch (err) {
        console.error('Failed to mark all present:', err);
      } finally {
        setIsMarkingAll(false);
      }
    }
    setIsConfirmAllOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Event Selector & Bulk Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex-1 max-w-xl">
          <label
            htmlFor="attendance-event-select"
            className="block text-xs font-semibold text-slate-700"
          >
            Select Club Event for Roster Check-In
          </label>
          <select
            id="attendance-event-select"
            value={selectedEvent.id}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} — {evt.date} ({evt.status})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            Location: <span className="font-medium text-slate-800">{selectedEvent.location}</span> · Time: <span className="font-mono">{selectedEvent.time}</span> · Reward: <span className="font-mono">+{selectedEvent.creditReward} cr</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="attendance-dept-filter" className="sr-only">
              Filter roster by department
            </label>
            <select
              id="attendance-dept-filter"
              value={deptFilter}
              onChange={(e) =>
                setDeptFilter(e.target.value as DepartmentName | 'All')
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {ALL_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={!hasEditAccess || !selectedEvent.id}
            onClick={() => setIsConfirmAllOpen(true)}
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark All Present</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Attendance */}
      <Modal
        isOpen={isConfirmAllOpen}
        onClose={() => setIsConfirmAllOpen(false)}
        title="Confirm Bulk Attendance Check-In"
        subtitle={`Apply 'Present' status to all registered members for ${selectedEvent.title}.`}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-xs text-amber-800 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              This action will set the attendance status of all{' '}
              <strong>{visibleMembers.length} active club members</strong> to{' '}
              <strong>Present</strong> for <em>{selectedEvent.title}</em>. Any previously recorded Excused or Absent marks will be overwritten.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmAllOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmMarkAll}
            >
              Confirm & Mark Present
            </Button>
          </div>
        </div>
      </Modal>

      {/* Event Attendance Summary KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Session Attendance Rate"
          value={`${summary.presentRate}%`}
          delta={summary.presentRate >= 85 ? 'Above Target' : 'Needs Review'}
          deltaTone={summary.presentRate >= 85 ? 'positive' : 'warning'}
          subtext="Present + Excused members"
        />
        <StatCard
          label="Marked Present"
          value={summary.presentCount}
          delta={`of ${members.length}`}
          subtext="Verified in-person check-in"
        />
        <StatCard
          label="Marked Excused"
          value={summary.excusedCount}
          delta="Approved notice"
          subtext="Academic or exam conflict"
        />
        <StatCard
          label="Marked Absent"
          value={summary.absentCount}
          delta={summary.absentCount === 0 ? 'Full Turnout' : 'Unexcused'}
          deltaTone={summary.absentCount === 0 ? 'positive' : 'warning'}
          subtext="Requires follow-up by Dept Head"
        />
      </div>

      {/* Attendance Roster Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              Member Check-In Roster ({visibleMembers.length})
            </h3>
            <p className="text-xs text-slate-500">
              {hasEditAccess
                ? `Logged in as ${currentUser.role} (${currentUser.name}) — click Present, Excused, or Absent to update live attendance.`
                : `Logged in as ${currentUser.role} — view-only mode for this department's event.`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Member
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Department & Role
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600">
                  Overall Rate
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Current Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600">
                  Mark Attendance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {visibleMembers.map((member) => {
                const status = getMemberStatus(member.id);
                const statusTone =
                  status === 'Present'
                    ? 'success'
                    : status === 'Excused'
                    ? 'warning'
                    : 'danger';

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">
                        {member.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {member.studentId}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-xs font-medium text-slate-800">
                        {member.department}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {member.role}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-xs font-semibold text-slate-800">
                      {member.attendancePercentage}%
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone} withDot>{status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                        {(['Present', 'Excused', 'Absent'] as AttendanceStatus[]).map(
                          (option) => {
                            const isActive = status === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                disabled={!hasEditAccess}
                                aria-label={`Mark ${member.name} as ${option}`}
                                onClick={() =>
                                  markAttendance(
                                    selectedEvent.id,
                                    member.id,
                                    option
                                  )
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isActive
                                    ? option === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : option === 'Excused'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
