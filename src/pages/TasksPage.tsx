import React, { useState } from 'react';
import { Plus, Clock, CheckCircle2 } from 'lucide-react';
import { ClubTask, TaskPriority, TaskStatus } from '../types';
import { useClubStore } from '../hooks/useClubStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const TasksPage: React.FC = () => {
  const { tasks, members, addTask, changeTaskStatus, currentUser } = useClubStore();

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canAssignTask =
    currentUser.role === 'Admin' || currentUser.role === 'Department Head';

  // New Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState(members[0]?.id || 'usr-1');
  const [deadline, setDeadline] = useState('2026-11-18');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [creditValue, setCreditValue] = useState(25);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesPriority =
      priorityFilter === 'All' || t.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline.trim()) {
      setFormError('Please enter a task title and deadline.');
      return;
    }

    const assignee =
      members.find((m) => m.id === assignedToId) || members[0];

    setIsSubmitting(true);
    setFormError('');

    try {
      await addTask({
        title: title.trim(),
        description:
          description.trim() || 'Assigned club deliverable tracked in CampusPulse.',
        assignedToId: assignee.id,
        assignedToName: assignee.name,
        department: assignee.department,
        deadline,
        status: 'To Do',
        priority,
        creditValue: Number(creditValue) || 20,
      });

      setTitle('');
      setDescription('');
      setFormError('');
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: TaskStatus[] = [
    'To Do',
    'In Progress',
    'Under Review',
    'Completed',
  ];

  return (
    <div className="space-y-6">
      {/* Header & Assign Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Club Tasks & Deliverables ({filteredTasks.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Track assigned tasks, deadlines, priorities, and automatically credit members upon task completion.
          </p>
        </div>

        {canAssignTask && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Assign New Task</span>
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['All', ...statusOptions] as (TaskStatus | 'All')[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="task-priority-filter"
            className="text-xs font-medium text-slate-600"
          >
            Priority:
          </label>
          <select
            id="task-priority-filter"
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as TaskPriority | 'All')
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Task Title & Description
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Assigned Member
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Deadline
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Priority
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600">
                  Update Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredTasks.map((task: ClubTask) => {
                const priorityTone =
                  task.priority === 'High'
                    ? 'danger'
                    : task.priority === 'Medium'
                    ? 'warning'
                    : 'neutral';

                const statusTone =
                  task.status === 'Completed'
                    ? 'success'
                    : task.status === 'In Progress'
                    ? 'info'
                    : task.status === 'Under Review'
                    ? 'warning'
                    : 'neutral';

                const isOverdue =
                  task.status !== 'Completed' &&
                  new Date(task.deadline).getTime() < new Date().setHours(0, 0, 0, 0);

                const canEditStatus =
                  currentUser.role === 'Admin' ||
                  (currentUser.role === 'Department Head' &&
                    currentUser.department === task.department) ||
                  currentUser.id === task.assignedToId;

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5 max-w-md">
                      <div className="font-semibold text-slate-900">
                        {task.title}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                        {task.description}
                      </p>
                      <span className="mt-1 inline-block text-[11px] font-mono text-slate-500">
                        Reward: +{task.creditValue} cr
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs font-semibold text-slate-900">
                        {task.assignedToName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {task.department}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs">
                        <span className={isOverdue ? 'font-semibold text-rose-700' : 'text-slate-800'}>
                          {task.deadline}
                        </span>
                        {isOverdue && (
                          <Badge tone="danger" className="text-[10px] px-1 py-0 font-sans">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={priorityTone}>{task.priority}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={statusTone} withDot>{task.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canEditStatus ? (
                        <>
                          <label
                            htmlFor={`status-select-${task.id}`}
                            className="sr-only"
                          >
                            Change status for {task.title}
                          </label>
                          <select
                            id={`status-select-${task.id}`}
                            value={task.status}
                            onChange={(e) =>
                              changeTaskStatus(
                                task.id,
                                e.target.value as TaskStatus
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign New Club Task"
        subtitle="Assign a deliverable to a club member with a deadline and credit reward."
      >
        <form onSubmit={handleCreateTask} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Task Title
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFormError('');
              }}
              placeholder="e.g. Prepare catering order for November General Assembly"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="task-desc-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Task Details
            </label>
            <textarea
              id="task-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deliverable expectations and links..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-assignee-select"
                className="block text-xs font-semibold text-slate-700"
              >
                Assign To Member
              </label>
              <select
                id="task-assignee-select"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-deadline-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Deadline
              </label>
              <input
                id="task-deadline-input"
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-priority-select"
                className="block text-xs font-semibold text-slate-700"
              >
                Priority
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-credits-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Completion Credit Reward
              </label>
              <input
                id="task-credits-input"
                type="number"
                min={5}
                max={100}
                value={creditValue}
                onChange={(e) => setCreditValue(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-red-600">
              ! {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
