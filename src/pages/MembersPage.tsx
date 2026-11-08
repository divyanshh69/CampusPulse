import React, { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus, LayoutGrid, List, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { DepartmentName, User, UserRole } from '../types';
import { ALL_DEPARTMENTS, useClubStore } from '../hooks/useClubStore';
import { filterMembers, canManageDepartment } from '../utils/clubLogic';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { MemberCard } from '../components/ui/MemberCard';
import { Modal } from '../components/ui/Modal';

export const MembersPage: React.FC = () => {
  const {
    members,
    currentUser,
    isLoadingMembers,
    membersError,
    fetchMembers,
    addMember,
    updateMember,
    deactivateMember,
    setCurrentPage,
  } = useClubStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentName | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newMajor, setNewMajor] = useState('');
  const [newYear, setNewYear] = useState<User['academicYear']>('2nd Year');
  const [newDept, setNewDept] = useState<DepartmentName>(
    currentUser.role === 'Department Head' ? currentUser.department : 'Technical & Engineering'
  );
  const [newRole, setNewRole] = useState<UserRole>('Member');
  const [formError, setFormError] = useState('');

  // Edit Member Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMajor, setEditMajor] = useState('');
  const [editYear, setEditYear] = useState<User['academicYear']>('2nd Year');
  const [editDept, setEditDept] = useState<DepartmentName>('Technical & Engineering');
  const [editRole, setEditRole] = useState<UserRole>('Member');
  const [editStatus, setEditStatus] = useState<User['status']>('Active');
  const [editBio, setEditBio] = useState('');
  const [editError, setEditError] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  // Success Feedback Banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Ensure members are fetched when the page loads
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Sync default department when currentUser changes
  useEffect(() => {
    if (currentUser.role === 'Department Head') {
      setNewDept(currentUser.department);
      setNewRole('Member');
    }
  }, [currentUser]);

  const canAddMember =
    currentUser.role === 'Admin' || currentUser.role === 'Department Head';

  const filteredMembers = useMemo(
    () => filterMembers(members, searchQuery, departmentFilter, roleFilter),
    [members, searchQuery, departmentFilter, roleFilter]
  );

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleOpenAddModal = () => {
    setNewName('');
    setNewEmail('');
    setNewStudentId(`STU-2026-${Math.floor(100 + Math.random() * 900)}`);
    setNewMajor('');
    setNewYear('2nd Year');
    setNewDept(
      currentUser.role === 'Department Head' ? currentUser.department : 'Technical & Engineering'
    );
    setNewRole('Member');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newMajor.trim()) {
      setFormError('Please provide the member name, university email, and academic major.');
      return;
    }

    setIsSubmittingAdd(true);
    setFormError('');

    try {
      await addMember({
        name: newName.trim(),
        email: newEmail.trim(),
        studentId: newStudentId.trim() || `STU-2026-${Math.floor(100 + Math.random() * 900)}`,
        academicYear: newYear,
        major: newMajor.trim(),
        departmentId: newDept,
        department: newDept,
        role: currentUser.role === 'Department Head' ? 'Member' : newRole,
        bio: `${newYear} majoring in ${newMajor.trim()}.`,
      });

      setIsAddModalOpen(false);
      showFeedback(`✓ Successfully onboarded '${newName.trim()}' to the database.`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create member. Please check inputs.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenEditModal = (member: User) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditMajor(member.major);
    setEditYear(member.academicYear);
    setEditDept(member.department);
    setEditRole(member.role);
    setEditStatus(member.status);
    setEditBio(member.bio || '');
    setEditError('');
    setConfirmDeactivate(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editName.trim() || !editEmail.trim() || !editMajor.trim()) {
      setEditError('Please fill out all required fields.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError('');

    try {
      await updateMember(editingMember.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        major: editMajor.trim(),
        academicYear: editYear,
        department: currentUser.role === 'Department Head' ? editingMember.department : editDept,
        role: currentUser.role === 'Department Head' ? editingMember.role : editRole,
        status: editStatus,
        bio: editBio.trim(),
      });

      setIsEditModalOpen(false);
      showFeedback(`✓ Successfully updated '${editName.trim()}' in PostgreSQL.`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update member.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeactivateMember = async () => {
    if (!editingMember) return;
    setIsSubmittingEdit(true);
    setEditError('');

    try {
      await deactivateMember(editingMember.id);
      setIsEditModalOpen(false);
      showFeedback(`✓ Member '${editingMember.name}' has been deactivated (status set to Alumni).`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to deactivate member.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleInspectMember = (_member: User) => {
    setCurrentPage('profile');
  };

  const columns: ColumnDef<User>[] = [
    {
      key: 'name',
      header: 'Member Name',
      render: (m) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{m.name}</span>
            {m.status !== 'Active' && (
              <Badge
                tone={m.status === 'Probation' ? 'warning' : 'neutral'}
                className="text-[10px]"
              >
                {m.status}
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {m.email} · <span className="font-mono">{m.studentId}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (m) => (
        <div>
          <div className="text-xs font-medium text-slate-800">{m.department}</div>
          <div className="text-[11px] text-slate-500">
            {m.academicYear} · {m.major}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (m) => (
        <Badge
          tone={
            m.role === 'Admin'
              ? 'danger'
              : m.role === 'Department Head'
              ? 'info'
              : 'neutral'
          }
        >
          {m.role}
        </Badge>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance %',
      align: 'right',
      render: (m) => {
        const tone =
          m.attendancePercentage >= 85
            ? 'success'
            : m.attendancePercentage >= 75
            ? 'warning'
            : 'danger';
        return (
          <Badge tone={tone} className="font-mono tabular-nums">
            {m.attendancePercentage}%
          </Badge>
        );
      },
    },
    {
      key: 'credits',
      header: 'Total Credits',
      align: 'right',
      render: (m) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {m.totalCredits} cr
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (m) => {
        const hasEditAccess = canManageDepartment(currentUser, m.department);
        return (
          <div className="flex items-center justify-end gap-3">
            {hasEditAccess && (
              <button
                type="button"
                onClick={() => handleOpenEditModal(m)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-900 underline underline-offset-2 cursor-pointer"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => handleInspectMember(m)}
              className="text-xs font-medium text-slate-700 hover:text-slate-950 underline underline-offset-2 cursor-pointer"
            >
              Profile
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Club Members ({filteredMembers.length})
            </h2>
            {isLoadingMembers && (
              <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Real-time directory synced with PostgreSQL. Search, filter by department or role, and track individual attendance and credit balances.
          </p>
        </div>

        {canAddMember && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member</span>
          </Button>
        )}
      </div>

      {/* Action Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs font-medium text-emerald-800 animate-fade-in flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Banner with Retry */}
      {membersError && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{membersError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchMembers()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Search & Filter Controls Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <label htmlFor="member-search" className="sr-only">
              Search members by name, email, ID, or major
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="member-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, student ID, or major..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <div className="md:col-span-3">
            <label htmlFor="dept-filter" className="sr-only">
              Filter by Department
            </label>
            <select
              id="dept-filter"
              value={departmentFilter}
              onChange={(e) =>
                setDepartmentFilter(e.target.value as DepartmentName | 'All')
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {ALL_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="md:col-span-2">
            <label htmlFor="role-filter" className="sr-only">
              Filter by Role
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'All')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Department Head">Department Head</option>
              <option value="Member">Member</option>
            </select>
          </div>

          {/* View Mode Segmented Control */}
          <div className="md:col-span-2 flex justify-end">
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-label="Cards view"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingMembers && members.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <RefreshCw className="mx-auto h-6 w-6 text-slate-400 animate-spin" />
          <p className="mt-2 text-xs font-medium text-slate-600">
            Querying PostgreSQL database for club members...
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredMembers}
          rowKey={(m) => m.id}
          emptyMessage="No club members match your current search or department filters."
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setDepartmentFilter('All');
                setRoleFilter('All');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onSelect={handleInspectMember}
              canEdit={canManageDepartment(currentUser, member.department)}
              onEdit={handleOpenEditModal}
            />
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Club Member"
        subtitle="New members are created in PostgreSQL with 50 starter credits and 100% initial attendance standing."
      >
        <form onSubmit={handleCreateMember} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-member-name"
                className="block text-xs font-semibold text-slate-700"
              >
                Full Name
              </label>
              <input
                id="new-member-name"
                type="text"
                required
                disabled={isSubmittingAdd}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setFormError('');
                }}
                placeholder="e.g. Jordan Patel"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="new-member-email"
                className="block text-xs font-semibold text-slate-700"
              >
                University Email
              </label>
              <input
                id="new-member-email"
                type="email"
                required
                disabled={isSubmittingAdd}
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setFormError('');
                }}
                placeholder="jordan.patel@university.edu"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-member-dept"
                className="block text-xs font-semibold text-slate-700"
              >
                Department
              </label>
              <select
                id="new-member-dept"
                value={newDept}
                disabled={currentUser.role === 'Department Head' || isSubmittingAdd}
                onChange={(e) => setNewDept(e.target.value as DepartmentName)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
              >
                {ALL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {currentUser.role === 'Department Head' && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Department Heads can only add members within their own department.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="new-member-role"
                className="block text-xs font-semibold text-slate-700"
              >
                Assigned Role
              </label>
              <select
                id="new-member-role"
                value={newRole}
                disabled={currentUser.role === 'Department Head' || isSubmittingAdd}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
              >
                <option value="Member">Member</option>
                {currentUser.role === 'Admin' && (
                  <>
                    <option value="Department Head">Department Head</option>
                    <option value="Admin">Admin</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="new-member-id"
                className="block text-xs font-semibold text-slate-700"
              >
                Student ID
              </label>
              <input
                id="new-member-id"
                type="text"
                disabled={isSubmittingAdd}
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="new-member-year"
                className="block text-xs font-semibold text-slate-700"
              >
                Academic Year
              </label>
              <select
                id="new-member-year"
                value={newYear}
                disabled={isSubmittingAdd}
                onChange={(e) =>
                  setNewYear(e.target.value as User['academicYear'])
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="new-member-major"
                className="block text-xs font-semibold text-slate-700"
              >
                Major
              </label>
              <input
                id="new-member-major"
                type="text"
                required
                disabled={isSubmittingAdd}
                value={newMajor}
                onChange={(e) => {
                  setNewMajor(e.target.value);
                  setFormError('');
                }}
                placeholder="e.g. Computer Engineering"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 border border-red-200 text-xs font-medium text-red-700"
            >
              ! {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmittingAdd}
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingAdd}
            >
              {isSubmittingAdd ? 'Adding to PostgreSQL...' : 'Confirm & Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Member: ${editingMember.name}`}
          subtitle={`Update record in PostgreSQL. Student ID: ${editingMember.studentId}`}
        >
          <form onSubmit={handleUpdateMember} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-member-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Full Name
                </label>
                <input
                  id="edit-member-name"
                  type="text"
                  required
                  disabled={isSubmittingEdit}
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditError('');
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-member-email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  University Email
                </label>
                <input
                  id="edit-member-email"
                  type="email"
                  required
                  disabled={isSubmittingEdit}
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    setEditError('');
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="edit-member-dept"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Department
                </label>
                <select
                  id="edit-member-dept"
                  value={editDept}
                  disabled={currentUser.role === 'Department Head' || isSubmittingEdit}
                  onChange={(e) => setEditDept(e.target.value as DepartmentName)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
                >
                  {ALL_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-member-role"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Role
                </label>
                <select
                  id="edit-member-role"
                  value={editRole}
                  disabled={currentUser.role === 'Department Head' || isSubmittingEdit}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
                >
                  <option value="Member">Member</option>
                  {currentUser.role === 'Admin' && (
                    <>
                      <option value="Department Head">Department Head</option>
                      <option value="Admin">Admin</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-member-status"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Standing Status
                </label>
                <select
                  id="edit-member-status"
                  value={editStatus}
                  disabled={isSubmittingEdit}
                  onChange={(e) => setEditStatus(e.target.value as User['status'])}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="Alumni">Alumni</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-member-year"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Academic Year
                </label>
                <select
                  id="edit-member-year"
                  value={editYear}
                  disabled={isSubmittingEdit}
                  onChange={(e) =>
                    setEditYear(e.target.value as User['academicYear'])
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-member-major"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Major
                </label>
                <input
                  id="edit-member-major"
                  type="text"
                  required
                  disabled={isSubmittingEdit}
                  value={editMajor}
                  onChange={(e) => {
                    setEditMajor(e.target.value);
                    setEditError('');
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-member-bio"
                className="block text-xs font-semibold text-slate-700"
              >
                Bio
              </label>
              <textarea
                id="edit-member-bio"
                rows={2}
                disabled={isSubmittingEdit}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            {editError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 border border-red-200 text-xs font-medium text-red-700"
              >
                ! {editError}
              </div>
            )}

            {/* Deactivation Safeguard Box */}
            {confirmDeactivate ? (
              <div className="rounded-lg bg-amber-50 p-3.5 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Confirm Deactivation</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Are you sure you want to deactivate <strong>{editingMember.name}</strong>? Their standing will be updated to <strong>Alumni</strong> in PostgreSQL and any department head assignment cleared. Historical attendance and credit transactions will be safely preserved.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    disabled={isSubmittingEdit}
                    onClick={handleDeactivateMember}
                  >
                    {isSubmittingEdit ? 'Deactivating...' : 'Confirm Deactivate'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSubmittingEdit}
                    onClick={() => setConfirmDeactivate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              editingMember.id !== currentUser.id && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Safe member offboarding / deactivation
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDeactivate(true)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                  >
                    Deactivate Member (Mark Alumni)
                  </button>
                </div>
              )
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
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
                {isSubmittingEdit ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
