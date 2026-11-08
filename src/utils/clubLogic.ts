import {
  User,
  ClubEvent,
  AttendanceRecord,
  AttendanceStatus,
  CreditTransaction,
  ClubTask,
  DepartmentName,
  UserRole,
} from '../types';

export interface DashboardMetrics {
  totalMembers: number;
  upcomingEventsCount: number;
  averageAttendance: number;
  totalCreditsDistributed: number;
}

/**
 * Computes aggregate KPI metrics for the Dashboard from current state.
 */
export function calculateDashboardMetrics(
  members: User[],
  events: ClubEvent[]
): DashboardMetrics {
  const totalMembers = members.length;
  const upcomingEventsCount = events.filter(
    (e) => e.status === 'Upcoming' || e.status === 'Ongoing'
  ).length;

  const averageAttendance =
    totalMembers > 0
      ? Math.round(
          members.reduce((sum, m) => sum + m.attendancePercentage, 0) /
            totalMembers
        )
      : 0;

  const totalCreditsDistributed = members.reduce(
    (sum, m) => sum + m.totalCredits,
    0
  );

  return {
    totalMembers,
    upcomingEventsCount,
    averageAttendance,
    totalCreditsDistributed,
  };
}

/**
 * Filters members by search query, department, and role.
 */
export function filterMembers(
  members: User[],
  searchQuery: string,
  departmentFilter: DepartmentName | 'All',
  roleFilter: UserRole | 'All'
): User[] {
  const q = searchQuery.trim().toLowerCase();
  return members.filter((member) => {
    const matchesSearch =
      !q ||
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      member.studentId.toLowerCase().includes(q) ||
      member.major.toLowerCase().includes(q);

    const matchesDepartment =
      departmentFilter === 'All' || member.department === departmentFilter;

    const matchesRole = roleFilter === 'All' || member.role === roleFilter;

    return matchesSearch && matchesDepartment && matchesRole;
  });
}

/**
 * Updates or inserts an attendance record for a given event and member,
 * and recalculates the member's overall attendance percentage.
 */
export function updateEventAttendance(
  records: AttendanceRecord[],
  members: User[],
  eventId: string,
  memberId: string,
  newStatus: AttendanceStatus,
  markedBy: string
): { updatedRecords: AttendanceRecord[]; updatedMembers: User[] } {
  const existingIndex = records.findIndex(
    (r) => r.eventId === eventId && r.memberId === memberId
  );

  const now = '2026-11-05 14:30';
  let updatedRecords: AttendanceRecord[];

  if (existingIndex >= 0) {
    updatedRecords = records.map((r, idx) =>
      idx === existingIndex ? { ...r, status: newStatus, markedAt: now, markedBy } : r
    );
  } else {
    updatedRecords = [
      ...records,
      {
        id: `att-${Date.now()}-${memberId}`,
        eventId,
        memberId,
        status: newStatus,
        markedAt: now,
        markedBy,
      },
    ];
  }

  // Adjust member attendance percentage smoothly based on their recorded sessions
  const updatedMembers = members.map((m) => {
    if (m.id !== memberId) return m;
    const memberRecords = updatedRecords.filter((r) => r.memberId === memberId);
    if (memberRecords.length === 0) return m;
    const attendedCount = memberRecords.filter(
      (r) => r.status === 'Present' || r.status === 'Excused'
    ).length;
    const sessionRatio = Math.round((attendedCount / memberRecords.length) * 100);
    // Blend historical base with live session records
    const blended = Math.min(100, Math.max(0, Math.round(m.attendancePercentage * 0.7 + sessionRatio * 0.3)));
    return {
      ...m,
      attendancePercentage: blended,
    };
  });

  return { updatedRecords, updatedMembers };
}

/**
 * Calculates attendance breakdown for a specific event across all members.
 */
export function getEventAttendanceSummary(
  records: AttendanceRecord[],
  members: User[],
  eventId: string
): {
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  unmarkedCount: number;
  presentRate: number;
} {
  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  let unmarkedCount = 0;

  for (const member of members) {
    const rec = records.find(
      (r) => r.eventId === eventId && r.memberId === member.id
    );
    if (!rec) {
      unmarkedCount++;
    } else if (rec.status === 'Present') {
      presentCount++;
    } else if (rec.status === 'Absent') {
      absentCount++;
    } else if (rec.status === 'Excused') {
      excusedCount++;
    }
  }

  const totalMarked = presentCount + absentCount + excusedCount;
  const presentRate =
    totalMarked > 0
      ? Math.round(((presentCount + excusedCount) / totalMarked) * 100)
      : 0;

  return {
    presentCount,
    absentCount,
    excusedCount,
    unmarkedCount,
    presentRate,
  };
}

/**
 * Applies a credit adjustment (award or deduction) to a member and prepends a transaction record.
 */
export function applyCreditAdjustment(
  members: User[],
  transactions: CreditTransaction[],
  params: {
    memberId: string;
    delta: number;
    reason: string;
    category: CreditTransaction['category'];
    issuedBy: string;
  }
): {
  updatedMembers: User[];
  updatedTransactions: CreditTransaction[];
  targetMember: User | undefined;
} {
  const targetMember = members.find((m) => m.id === params.memberId);
  if (!targetMember || !params.reason.trim() || params.delta === 0) {
    return {
      updatedMembers: members,
      updatedTransactions: transactions,
      targetMember: undefined,
    };
  }

  const updatedMembers = members.map((m) =>
    m.id === params.memberId
      ? { ...m, totalCredits: Math.max(0, m.totalCredits + params.delta) }
      : m
  );

  const newTx: CreditTransaction = {
    id: `crd-${Date.now()}`,
    memberId: targetMember.id,
    memberName: targetMember.name,
    memberDepartment: targetMember.department,
    delta: params.delta,
    reason: params.reason.trim(),
    category: params.category,
    timestamp: '2026-11-05 14:35',
    issuedBy: params.issuedBy,
  };

  return {
    updatedMembers,
    updatedTransactions: [newTx, ...transactions],
    targetMember: updatedMembers.find((m) => m.id === params.memberId),
  };
}

/**
 * Returns members sorted descending by total credits for the leaderboard.
 */
export function getLeaderboard(members: User[]): User[] {
  return [...members].sort((a, b) => {
    if (b.totalCredits !== a.totalCredits) {
      return b.totalCredits - a.totalCredits;
    }
    return b.attendancePercentage - a.attendancePercentage;
  });
}

/**
 * Checks whether the current user role has permission to perform management actions
 * within a given department (or globally for Admin).
 */
export function canManageDepartment(
  currentUser: User,
  targetDepartment?: DepartmentName | 'All Departments'
): boolean {
  if (currentUser.role === 'Admin') return true;
  if (currentUser.role === 'Department Head') {
    if (!targetDepartment || targetDepartment === 'All Departments') return true;
    return currentUser.department === targetDepartment;
  }
  return false;
}

/**
 * Cycles or updates a task's status and awards credits if newly completed.
 */
export function updateTaskStatus(
  tasks: ClubTask[],
  members: User[],
  taskId: string,
  newStatus: ClubTask['status']
): { updatedTasks: ClubTask[]; updatedMembers: User[] } {
  const existingTask = tasks.find((t) => t.id === taskId);
  if (!existingTask) {
    return { updatedTasks: tasks, updatedMembers: members };
  }

  const wasCompleted = existingTask.status === 'Completed';
  const isNowCompleted = newStatus === 'Completed';

  const updatedTasks = tasks.map((t) =>
    t.id === taskId ? { ...t, status: newStatus } : t
  );

  let updatedMembers = members;
  if (!wasCompleted && isNowCompleted) {
    updatedMembers = members.map((m) =>
      m.id === existingTask.assignedToId
        ? { ...m, totalCredits: m.totalCredits + existingTask.creditValue }
        : m
    );
  }

  return { updatedTasks, updatedMembers };
}
