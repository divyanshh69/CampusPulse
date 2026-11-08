import React, { useState, useEffect } from 'react';
import { CalendarPlus, Search, RefreshCw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { ClubEvent, DepartmentName, EventStatus } from '../types';
import { ALL_DEPARTMENTS, useClubStore } from '../hooks/useClubStore';
import { Button } from '../components/ui/Button';
import { EventCard } from '../components/ui/EventCard';
import { Modal } from '../components/ui/Modal';

export const EventsPage: React.FC = () => {
  const {
    events,
    isLoadingEvents,
    eventsError,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    currentUser,
    setCurrentPage,
  } = useClubStore();

  const [statusFilter, setStatusFilter] = useState<EventStatus | 'All'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentName | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Event Form State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-11-24');
  const [time, setTime] = useState('17:00 - 19:00');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState<DepartmentName | 'All Departments'>(
    currentUser.role === 'Department Head' ? currentUser.department : 'All Departments'
  );
  const [capacity, setCapacity] = useState(60);
  const [creditReward, setCreditReward] = useState(25);
  const [mandatory, setMandatory] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Event Form State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDepartment, setEditDepartment] = useState<DepartmentName | 'All Departments'>('All Departments');
  const [editStatus, setEditStatus] = useState<EventStatus>('Upcoming');
  const [editCapacity, setEditCapacity] = useState(60);
  const [editCreditReward, setEditCreditReward] = useState(25);
  const [editMandatory, setEditMandatory] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Success Feedback Banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Ensure fresh events are loaded on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Authorization checks
  const canCreateEvent = currentUser.role === 'Admin' || currentUser.role === 'Department Head';

  const canEditEvent = (evt: ClubEvent): boolean => {
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Department Head') {
      return evt.department === currentUser.department;
    }
    return false;
  };

  const filteredEvents = events.filter((e) => {
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    const matchesDept = departmentFilter === 'All' || e.department === departmentFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  const handleOpenCreateModal = () => {
    setTitle('');
    setDescription('');
    setDate('2026-11-24');
    setTime('17:00 - 19:00');
    setLocation('');
    setDepartment(
      currentUser.role === 'Department Head' ? currentUser.department : 'All Departments'
    );
    setCapacity(60);
    setCreditReward(25);
    setMandatory(false);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !date.trim()) {
      setFormError('Please provide an event title, date, and campus location.');
      return;
    }

    setIsSubmittingCreate(true);
    setFormError('');

    try {
      await addEvent({
        title: title.trim(),
        description:
          description.trim() ||
          'Scheduled club session coordinated via CampusPulse.',
        date: date.trim(),
        time: time.trim() || '17:00 - 19:00',
        location: location.trim(),
        department,
        status: 'Upcoming',
        capacity: Number(capacity) || 50,
        creditReward: Number(creditReward) || 20,
        mandatory,
      });

      setIsCreateModalOpen(false);
      showFeedback(`Event "${title.trim()}" published successfully.`);
    } catch (err: any) {
      console.error('Failed to create event:', err);
      setFormError(err.message || 'Failed to create event. Please verify backend connection.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenEditModal = (event: ClubEvent) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditDate(event.date);
    setEditTime(event.time);
    setEditLocation(event.location);
    setEditDepartment(event.department);
    setEditStatus(event.status);
    setEditCapacity(event.capacity);
    setEditCreditReward(event.creditReward);
    setEditMandatory(event.mandatory);
    setEditError('');
    setConfirmDelete(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    if (!editTitle.trim() || !editLocation.trim() || !editDate.trim()) {
      setEditError('Please provide an event title, date, and campus location.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError('');

    try {
      await updateEvent(editingEvent.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        date: editDate.trim(),
        time: editTime.trim(),
        location: editLocation.trim(),
        department: editDepartment,
        status: editStatus,
        capacity: Number(editCapacity) || 60,
        creditReward: Number(editCreditReward) || 20,
        mandatory: editMandatory,
      });

      setIsEditModalOpen(false);
      showFeedback(`Event "${editTitle.trim()}" updated successfully.`);
    } catch (err: any) {
      console.error('Failed to update event:', err);
      setEditError(err.message || 'Failed to update event. Please verify authorization.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    setIsSubmittingEdit(true);
    setEditError('');

    try {
      await deleteEvent(editingEvent.id);
      setIsEditModalOpen(false);
      showFeedback(`Event "${editingEvent.title}" removed.`);
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      setEditError(err.message || 'Failed to delete event.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleNavigateAttendance = () => {
    setCurrentPage('attendance');
  };

  const statuses: (EventStatus | 'All')[] = [
    'All',
    'Upcoming',
    'Ongoing',
    'Completed',
    'Cancelled',
  ];

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {feedbackMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs transition-all animate-fadeIn"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Backend Error Banner */}
      {eventsError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Database Connection Error</p>
              <p className="mt-0.5 text-red-700">{eventsError}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEvents()}
            disabled={isLoadingEvents}
            className="border-red-300 text-red-800 hover:bg-red-100 self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </Button>
        </div>
      )}

      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Club Events & Programming
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 font-mono">
              {filteredEvents.length}
            </span>
            {isLoadingEvents && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Manage workshops, general body assemblies, speaker mixers, and participant capacities.
          </p>
        </div>

        {canCreateEvent && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
          >
            <CalendarPlus className="h-4 w-4" />
            <span>Create New Event</span>
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {statuses.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'All' ? 'All Events' : st}
              </button>
            ))}
          </div>

          {/* Department Filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter events by department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value as DepartmentName | 'All')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {ALL_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search events or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <span className="font-mono tabular-nums">
            Showing {filteredEvents.length} of {events.length} sessions
          </span>
          {(statusFilter !== 'All' || departmentFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setDepartmentFilter('All');
                setSearchQuery('');
              }}
              className="text-slate-600 underline hover:text-slate-900 cursor-pointer"
            >
              Reset active filters
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingEvents && events.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-64 rounded-xl border border-slate-200 bg-white p-5 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="h-5 w-24 bg-slate-200 rounded" />
                <div className="h-5 w-16 bg-slate-200 rounded" />
              </div>
              <div className="mt-4 h-6 w-3/4 bg-slate-200 rounded" />
              <div className="mt-2 h-12 w-full bg-slate-100 rounded" />
              <div className="mt-6 space-y-2 border-t border-slate-100 pt-3">
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CalendarPlus className="h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900 font-display">
            No events match the selected criteria
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Try adjusting your status or department filter, or clear your search term.
          </p>
          {(statusFilter !== 'All' || departmentFilter !== 'All' || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('All');
                setDepartmentFilter('All');
                setSearchQuery('');
              }}
              className="mt-4"
            >
              Reset All Filters
            </Button>
          )}
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredEvents.map((event: ClubEvent) => (
            <EventCard
              key={event.id}
              event={event}
              onTakeAttendance={handleNavigateAttendance}
              onEdit={canEditEvent(event) ? handleOpenEditModal : undefined}
            />
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isSubmittingCreate && setIsCreateModalOpen(false)}
        title="Schedule New Club Event"
        subtitle={
          currentUser.role === 'Department Head'
            ? `Scheduling session for ${currentUser.department}.`
            : 'Publish a workshop, general body assembly, or departmental session.'
        }
      >
        <form onSubmit={handleCreateEvent} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="event-title"
              className="block text-xs font-semibold text-slate-700"
            >
              Event Name
            </label>
            <input
              id="event-title"
              type="text"
              required
              disabled={isSubmittingCreate}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFormError('');
              }}
              placeholder="e.g. Winter Demo Day & Project Showcase"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="event-desc"
              className="block text-xs font-semibold text-slate-700"
            >
              Description
            </label>
            <textarea
              id="event-desc"
              rows={2}
              disabled={isSubmittingCreate}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline agenda, prerequisites, or guest speakers..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="event-date"
                className="block text-xs font-semibold text-slate-700"
              >
                Date
              </label>
              <input
                id="event-date"
                type="date"
                required
                disabled={isSubmittingCreate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="event-time"
                className="block text-xs font-semibold text-slate-700"
              >
                Time Window
              </label>
              <input
                id="event-time"
                type="text"
                disabled={isSubmittingCreate}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="18:00 - 20:00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="event-location"
                className="block text-xs font-semibold text-slate-700"
              >
                Campus Location
              </label>
              <input
                id="event-location"
                type="text"
                required
                disabled={isSubmittingCreate}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setFormError('');
                }}
                placeholder="e.g. Engineering Hall Room 204"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="event-dept"
                className="block text-xs font-semibold text-slate-700"
              >
                Host Department
              </label>
              <select
                id="event-dept"
                value={department}
                disabled={currentUser.role === 'Department Head' || isSubmittingCreate}
                onChange={(e) =>
                  setDepartment(
                    e.target.value as DepartmentName | 'All Departments'
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600"
              >
                {currentUser.role === 'Admin' && (
                  <option value="All Departments">All Departments (Club-wide)</option>
                )}
                {ALL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {currentUser.role === 'Department Head' && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Department Heads can only create events for their department.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="event-capacity"
                className="block text-xs font-semibold text-slate-700"
              >
                Participant Capacity
              </label>
              <input
                id="event-capacity"
                type="number"
                min={5}
                max={500}
                disabled={isSubmittingCreate}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="event-credits"
                className="block text-xs font-semibold text-slate-700"
              >
                Attendance Credit Value
              </label>
              <input
                id="event-credits"
                type="number"
                min={0}
                max={100}
                disabled={isSubmittingCreate}
                value={creditReward}
                onChange={(e) => setCreditReward(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="event-mandatory"
              type="checkbox"
              disabled={isSubmittingCreate}
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <label
              htmlFor="event-mandatory"
              className="text-xs font-medium text-slate-700"
            >
              Mark as Mandatory General Body Attendance
            </label>
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              ! {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmittingCreate}
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingCreate}
            >
              {isSubmittingCreate ? 'Publishing...' : 'Publish Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)}
        title="Edit Event Details"
        subtitle={editingEvent ? `Editing ${editingEvent.title}` : undefined}
      >
        <form onSubmit={handleUpdateEvent} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="edit-event-title"
              className="block text-xs font-semibold text-slate-700"
            >
              Event Name
            </label>
            <input
              id="edit-event-title"
              type="text"
              required
              disabled={isSubmittingEdit}
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setEditError('');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="edit-event-desc"
              className="block text-xs font-semibold text-slate-700"
            >
              Description
            </label>
            <textarea
              id="edit-event-desc"
              rows={2}
              disabled={isSubmittingEdit}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-event-date"
                className="block text-xs font-semibold text-slate-700"
              >
                Date
              </label>
              <input
                id="edit-event-date"
                type="date"
                required
                disabled={isSubmittingEdit}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="edit-event-time"
                className="block text-xs font-semibold text-slate-700"
              >
                Time Window
              </label>
              <input
                id="edit-event-time"
                type="text"
                disabled={isSubmittingEdit}
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-event-location"
                className="block text-xs font-semibold text-slate-700"
              >
                Campus Location
              </label>
              <input
                id="edit-event-location"
                type="text"
                required
                disabled={isSubmittingEdit}
                value={editLocation}
                onChange={(e) => {
                  setEditLocation(e.target.value);
                  setEditError('');
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="edit-event-status"
                className="block text-xs font-semibold text-slate-700"
              >
                Status
              </label>
              <select
                id="edit-event-status"
                value={editStatus}
                disabled={isSubmittingEdit}
                onChange={(e) => setEditStatus(e.target.value as EventStatus)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-event-dept"
                className="block text-xs font-semibold text-slate-700"
              >
                Host Department
              </label>
              <select
                id="edit-event-dept"
                value={editDepartment}
                disabled={currentUser.role === 'Department Head' || isSubmittingEdit}
                onChange={(e) =>
                  setEditDepartment(
                    e.target.value as DepartmentName | 'All Departments'
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600"
              >
                <option value="All Departments">All Departments (Club-wide)</option>
                {ALL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="edit-event-capacity"
                className="block text-xs font-semibold text-slate-700"
              >
                Participant Capacity
              </label>
              <input
                id="edit-event-capacity"
                type="number"
                min={5}
                max={500}
                disabled={isSubmittingEdit}
                value={editCapacity}
                onChange={(e) => setEditCapacity(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-event-credits"
                className="block text-xs font-semibold text-slate-700"
              >
                Attendance Credit Value
              </label>
              <input
                id="edit-event-credits"
                type="number"
                min={0}
                max={100}
                disabled={isSubmittingEdit}
                value={editCreditReward}
                onChange={(e) => setEditCreditReward(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="edit-event-mandatory"
                  type="checkbox"
                  disabled={isSubmittingEdit}
                  checked={editMandatory}
                  onChange={(e) => setEditMandatory(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
                <span className="text-xs font-medium text-slate-700">
                  Mandatory Attendance
                </span>
              </label>
            </div>
          </div>

          {editError && (
            <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              ! {editError}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Delete event?</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={isSubmittingEdit}
                    onClick={handleDeleteEvent}
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSubmittingEdit}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmittingEdit}
                  onClick={() => setConfirmDelete(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>Delete Event</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isSubmittingEdit}
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
