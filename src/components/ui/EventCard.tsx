import React from 'react';
import { Pencil, Calendar, MapPin, Users, UserCheck, Ticket, CheckCircle2, RefreshCw } from 'lucide-react';
import { ClubEvent } from '../../types';
import { Badge, BadgeTone } from './Badge';
import { Button } from './Button';

interface EventCardProps {
  event: ClubEvent;
  isRegistered?: boolean;
  isRegistering?: boolean;
  canViewRegistrations?: boolean;
  onRegister?: (eventId: string) => void;
  onCancelRegistration?: (eventId: string) => void;
  onViewRegistrations?: (eventId: string) => void;
  onTakeAttendance?: (eventId: string) => void;
  onEdit?: (event: ClubEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isRegistered = false,
  isRegistering = false,
  canViewRegistrations = false,
  onRegister,
  onCancelRegistration,
  onViewRegistrations,
  onTakeAttendance,
  onEdit,
}) => {
  const statusTone: BadgeTone =
    event.status === 'Upcoming'
      ? 'info'
      : event.status === 'Ongoing'
      ? 'warning'
      : event.status === 'Completed'
      ? 'success'
      : 'danger';

  const isFull = event.participantCount >= event.capacity;
  const isRegisteredUser = isRegistered || event.isRegistered || false;
  const isEventPastOrCancelled = event.status === 'Cancelled' || event.status === 'Completed';

  const capacityPercent = Math.min(
    100,
    Math.round((event.participantCount / Math.max(event.capacity, 1)) * 100)
  );

  const hasManagementActions = Boolean(onEdit || onTakeAttendance || (canViewRegistrations && onViewRegistrations));
  const hasMemberActions = Boolean(onRegister || onCancelRegistration);

  return (
    <div className="card-base card-hover p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={statusTone} withDot>
              {event.status}
            </Badge>

            {isRegisteredUser && (
              <Badge tone="success" withDot>
                Registered
              </Badge>
            )}

            {isFull && event.status === 'Upcoming' && (
              <Badge tone="warning">
                Full
              </Badge>
            )}

            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-medium text-slate-700">{event.department}</span>

            {event.mandatory && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <Badge tone="warning">Mandatory</Badge>
              </>
            )}
          </div>
          <span className="font-mono tabular-nums text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded text-xs">
            +{event.creditReward} cr
          </span>
        </div>

        <h3 className="mt-3 text-base font-semibold text-slate-900 font-display">
          {event.title}
        </h3>
        <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        {/* Structured Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-mono tabular-nums truncate">
              {event.date}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="font-mono tabular-nums text-slate-500 truncate">
              {event.time}
            </span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800 truncate">
              {event.location}
            </span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>RSVP Capacity</span>
            </span>
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {event.participantCount} / {event.capacity} ({capacityPercent}%)
              {isFull && <span className="ml-1 text-amber-600 font-semibold">• Full</span>}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull
                  ? 'bg-amber-500'
                  : capacityPercent >= 80
                  ? 'bg-amber-400'
                  : 'bg-slate-900'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>
      </div>

      {(hasManagementActions || hasMemberActions) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {/* Management Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(event)}
                className="text-slate-700"
              >
                <Pencil className="h-3.5 w-3.5 mr-1 text-slate-400" />
                <span>Edit</span>
              </Button>
            )}

            {canViewRegistrations && onViewRegistrations && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewRegistrations(event.id)}
                className="text-slate-700"
              >
                <Users className="h-3.5 w-3.5 mr-1 text-slate-400" />
                <span>RSVPs ({event.participantCount})</span>
              </Button>
            )}

            {onTakeAttendance && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTakeAttendance(event.id)}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                <span>Attendance</span>
              </Button>
            )}
          </div>

          {/* Member Registration Actions */}
          {hasMemberActions && (
            <div className="ml-auto">
              {isRegisteredUser ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isRegistering || isEventPastOrCancelled}
                  onClick={() => onCancelRegistration && onCancelRegistration(event.id)}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                >
                  {isRegistering ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  )}
                  <span>{isRegistering ? 'Updating...' : 'Cancel RSVP'}</span>
                </Button>
              ) : (
                <Button
                  variant={isFull ? 'outline' : 'primary'}
                  size="sm"
                  disabled={isRegistering || isFull || isEventPastOrCancelled}
                  onClick={() => onRegister && onRegister(event.id)}
                  className={isFull ? 'border-slate-200 text-slate-400 cursor-not-allowed' : ''}
                >
                  {isRegistering ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Ticket className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  <span>
                    {isRegistering
                      ? 'Registering...'
                      : event.status === 'Cancelled'
                      ? 'Event Cancelled'
                      : event.status === 'Completed'
                      ? 'Event Ended'
                      : isFull
                      ? 'Full Capacity'
                      : 'RSVP / Register'}
                  </span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
