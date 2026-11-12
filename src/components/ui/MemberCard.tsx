import React from 'react';
import { User } from '../../types';
import { Badge } from './Badge';
import { Button } from './Button';

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

  const roleTone =
    member.role === 'Admin'
      ? 'brand'
      : member.role === 'Department Head'
      ? 'info'
      : 'neutral';

  return (
    <div className="card-base card-hover p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white font-mono shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {member.name}
                </h3>
                {member.status !== 'Active' && (
                  <Badge tone={statusTone} withDot className="text-[10px]">
                    {member.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{member.email}</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 shrink-0 font-medium">
            {member.studentId}
          </span>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs">
          <Badge tone={roleTone}>{member.role}</Badge>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-slate-700 font-medium">{member.department}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-slate-500">{member.academicYear}</span>
        </div>

        {member.bio && (
          <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-md border border-slate-100">
            {member.bio}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Attn:</span>
            <Badge tone={attendanceTone} className="font-mono tabular-nums">
              {member.attendancePercentage}%
            </Badge>
          </div>
          <span className="text-slate-200" aria-hidden="true">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Credits:</span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums">
              {member.totalCredits}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {canEdit && onEdit && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onEdit(member)}
            >
              Edit
            </Button>
          )}
          {onSelect && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => onSelect(member)}
            >
              Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
