import React from 'react';
import { User } from '../../types';
import { Badge } from './Badge';

interface MemberCardProps {
  member: User;
  onSelect?: (member: User) => void;
  canEdit?: boolean;
  onEdit?: (member: User) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  onSelect,
  canEdit = false,
  onEdit,
}) => {
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const attendanceTone =
    member.attendancePercentage >= 85
      ? 'success'
      : member.attendancePercentage >= 75
      ? 'warning'
      : 'danger';

  const statusTone =
    member.status === 'Active'
      ? 'success'
      : member.status === 'Probation'
      ? 'warning'
      : 'neutral';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white font-mono">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {member.name}
                </h3>
                {member.status !== 'Active' && (
                  <Badge tone={statusTone} className="text-[10px]">
                    {member.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{member.email}</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 shrink-0">
            {member.studentId}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{member.role}</span>
          <span aria-hidden="true">·</span>
          <span>{member.department}</span>
          <span aria-hidden="true">·</span>
          <span>{member.academicYear}</span>
        </div>

        {member.bio && (
          <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {member.bio}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-slate-400">Attendance: </span>
            <Badge tone={attendanceTone} className="font-mono tabular-nums">
              {member.attendancePercentage}%
            </Badge>
          </div>
          <span className="text-slate-300" aria-hidden="true">
            |
          </span>
          <div>
            <span className="text-slate-400">Credits: </span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums">
              {member.totalCredits}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(member)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
            >
              Edit
            </button>
          )}
          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(member)}
              className="text-xs font-medium text-slate-700 hover:text-slate-950 underline underline-offset-2 cursor-pointer"
            >
              Inspect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
