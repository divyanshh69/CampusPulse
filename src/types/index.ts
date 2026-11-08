export type UserRole = 'Admin' | 'Department Head' | 'Member';

export type DepartmentName =
  | 'Technical & Engineering'
  | 'Design & Creative'
  | 'Events & Operations'
  | 'Outreach & Sponsorships'
  | 'Content & Editorial';

export interface Department {
  id: string;
  name: DepartmentName;
  code: string;
  headId: string;
  headName: string;
  description: string;
  memberCount: number;
}

export type AcademicYear = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export interface User {
  id: string;
  name: string;
  email: string;
  studentId: string;
  academicYear: AcademicYear;
  major: string;
  departmentId: string;
  department: DepartmentName;
  role: UserRole;
  attendancePercentage: number;
  totalCredits: number;
  joinedDate: string;
  status: 'Active' | 'Probation' | 'Alumni';
  bio?: string;
}

export type EventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  department: DepartmentName | 'All Departments';
  status: EventStatus;
  participantCount: number;
  capacity: number;
  creditReward: number;
  mandatory: boolean;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused';

export interface AttendanceRecord {
  id: string;
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: string;
  note?: string;
}

export interface CreditTransaction {
  id: string;
  memberId: string;
  memberName: string;
  memberDepartment: DepartmentName;
  delta: number; // positive for award, negative for deduction
  reason: string;
  category: 'Event Attendance' | 'Task Completion' | 'Leadership Bonus' | 'Penalty / Deduction' | 'Peer Recognition';
  timestamp: string;
  issuedBy: string;
}

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'To Do' | 'In Progress' | 'Under Review' | 'Completed';

export interface ClubTask {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  department: DepartmentName;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  creditValue: number;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  target: string;
  timestamp: string;
  category: 'member' | 'event' | 'attendance' | 'credit' | 'task';
}

export type PageRoute =
  | 'dashboard'
  | 'members'
  | 'events'
  | 'attendance'
  | 'credits'
  | 'tasks'
  | 'profile'
  | 'settings'
  | 'login';
