import React from 'react';
import { Pencil } from 'lucide-react';
import { ClubEvent } from '../../types';
import { Badge } from './Badge';
import { Button } from './Button';

interface EventCardProps {
  event: ClubEvent;
  onTakeAttendance?: (eventId: string) => void;
  onEdit?: (event: ClubEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onTakeAttendance,
  onEdit,
}) => {
  const statusTone =
    event.status === 'Upcoming'
      ? 'info'
      : event.status === 'Ongoing'
      ? 'warning'
      : event.status === 'Completed'
      ? 'success'
      : 'danger';

  const capacityPercent = Math.min(
    100,
    Math.round((event.participantCount / event.capacity) * 100)
  );

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Badge tone={statusTone}>{event.status}</Badge>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-700">{event.department}</span>
            {event.mandatory && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                  Mandatory
                </span>
              </>
            )}
          </div>
          <span className="font-mono tabular-nums text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-xs">
            +{event.creditReward} cr
          </span>
        </div>

        <h3 className="mt-2.5 text-base font-semibold text-slate-900 font-display">
          {event.title}
        </h3>
        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
          {event.description}
        </p>

        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Date & Time</span>
            <span className="font-mono tabular-nums text-slate-800">
              {event.date} · {event.time}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Location</span>
            <span className="font-medium text-slate-800">{event.location}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Participants</span>
            <span className="font-mono tabular-nums text-slate-800">
              {event.participantCount} / {event.capacity} ({capacityPercent}%)
            </span>
          </div>
        </div>
      </div>

      {(onTakeAttendance || onEdit) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {onEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(event)}
              className="text-slate-700 hover:text-slate-900"
            >
              <Pencil className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <span>Edit Details</span>
            </Button>
          ) : (
            <div />
          )}

          {onTakeAttendance && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTakeAttendance(event.id)}
            >
              Manage Roster & Attendance
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
