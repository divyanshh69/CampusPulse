import { User, UserRole, DepartmentName, ClubEvent, EventStatus } from '../types';

/**
 * Storage key for the authentication JWT.
 * We store this in localStorage so that authenticated sessions persist across page reloads.
 */
export const AUTH_TOKEN_KEY = 'campuspulse_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to write authentication token to localStorage:', err);
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (err) {
    console.error('Failed to clear authentication token from localStorage:', err);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Maps backend UserRole enum ('ADMIN' | 'DEPARTMENT_HEAD' | 'MEMBER')
 * to frontend UserRole type ('Admin' | 'Department Head' | 'Member').
 */
export function formatUserRole(role: string): UserRole {
  if (role === 'ADMIN' || role === 'Admin') return 'Admin';
  if (role === 'DEPARTMENT_HEAD' || role === 'Department Head') return 'Department Head';
  return 'Member';
}

/**
 * Maps backend user record to frontend User interface.
 */
export function mapBackendUserToFrontend(raw: any): User {
  const role = formatUserRole(raw.role);
  const deptName: DepartmentName =
    typeof raw.department === 'string'
      ? (raw.department as DepartmentName)
      : (raw.department?.name as DepartmentName) ||
        (raw.departmentName as DepartmentName) ||
        'Technical & Engineering';

  let academicYear: User['academicYear'] = '2nd Year';
  if (
    raw.academicYear === 'FIRST_YEAR' ||
    raw.academicYear === '1st Year' ||
    raw.academicYear === 'FRESHMAN' ||
    raw.academicYear === 'Freshman'
  ) {
    academicYear = '1st Year';
  } else if (
    raw.academicYear === 'SECOND_YEAR' ||
    raw.academicYear === '2nd Year' ||
    raw.academicYear === 'SOPHOMORE' ||
    raw.academicYear === 'Sophomore'
  ) {
    academicYear = '2nd Year';
  } else if (
    raw.academicYear === 'THIRD_YEAR' ||
    raw.academicYear === '3rd Year' ||
    raw.academicYear === 'JUNIOR' ||
    raw.academicYear === 'Junior'
  ) {
    academicYear = '3rd Year';
  } else if (
    raw.academicYear === 'FOURTH_YEAR' ||
    raw.academicYear === '4th Year' ||
    raw.academicYear === 'SENIOR' ||
    raw.academicYear === 'Senior'
  ) {
    academicYear = '4th Year';
  }

  let status: User['status'] = 'Active';
  if (raw.status === 'PROBATION' || raw.status === 'Probation') status = 'Probation';
  else if (raw.status === 'ALUMNI' || raw.status === 'Alumni') status = 'Alumni';

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    studentId: raw.studentId || 'STU-2024-001',
    academicYear,
    major: raw.major || 'Computer Science',
    departmentId: raw.departmentId || 'dept-tech',
    department: deptName,
    role,
    attendancePercentage: Math.round(raw.attendancePercentage ?? 100),
    totalCredits: raw.totalCredits ?? 50,
    joinedDate: raw.joinedDate || 'Sep 2024',
    status,
    bio: raw.bio || '',
  };
}

export interface LoginResult {
  token: string;
  user: User;
}

/**
 * Sends login credentials to the backend /api/auth/login endpoint.
 */
export async function loginApi(
  email: string,
  password: string
): Promise<LoginResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.success) {
    const errorMsg =
      payload.message ||
      (res.status === 401
        ? 'Invalid email or password.'
        : 'Unable to connect to authentication server. Please check backend connection.');
    throw new Error(errorMsg);
  }

  const { token, user } = payload.data;
  return {
    token,
    user: mapBackendUserToFrontend(user),
  };
}

/**
 * Fetches the current authenticated user profile using the stored JWT token.
 */
export async function getCurrentUserApi(token: string): Promise<User> {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.success) {
    const errorMsg =
      payload.message || 'Authentication session has expired or is invalid.';
    throw new Error(errorMsg);
  }

  return mapBackendUserToFrontend(payload.data);
}

/**
 * Fetches all members from the real PostgreSQL database via Express API.
 */
export async function getMembersApi(filters?: {
  search?: string;
  departmentId?: string;
  role?: string;
}): Promise<User[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.departmentId && filters.departmentId !== 'All') {
    params.append('departmentId', filters.departmentId);
  }
  if (filters?.role && filters.role !== 'All') {
    params.append('role', filters.role);
  }

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/members${qs}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to fetch members from backend.');
  }

  return (payload.data || []).map(mapBackendUserToFrontend);
}

/**
 * Fetches single member details by ID from PostgreSQL.
 */
export async function getMemberByIdApi(id: string): Promise<User> {
  const res = await fetch(`/api/members/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.success) {
    throw new Error(payload.message || `Member with id '${id}' not found.`);
  }

  return mapBackendUserToFrontend(payload.data);
}

/**
 * Adds a new member to PostgreSQL.
 */
export async function createMemberApi(data: {
  name: string;
  email: string;
  studentId: string;
  major: string;
  departmentId: string;
  role?: UserRole;
  academicYear?: User['academicYear'];
  bio?: string;
}): Promise<User> {
  const res = await fetch('/api/members', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to create member.');
  }

  return mapBackendUserToFrontend(payload.data);
}

/**
 * Updates an existing member in PostgreSQL.
 */
export async function updateMemberApi(
  id: string,
  data: Partial<User>
): Promise<User> {
  const res = await fetch(`/api/members/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to update member.');
  }

  return mapBackendUserToFrontend(payload.data);
}

/**
 * Soft-deactivates a member in PostgreSQL (sets status to Alumni).
 */
export async function deactivateMemberApi(id: string): Promise<User> {
  const res = await fetch(`/api/members/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to deactivate member.');
  }

  return mapBackendUserToFrontend(payload.data);
}

/**
 * Maps backend event entity to frontend ClubEvent interface.
 */
export function mapBackendEventToFrontend(raw: any): ClubEvent {
  let status: EventStatus = 'Upcoming';
  const st = String(raw.status || '').toUpperCase();
  if (st === 'ONGOING' || raw.status === 'Ongoing') status = 'Ongoing';
  else if (st === 'COMPLETED' || raw.status === 'Completed') status = 'Completed';
  else if (st === 'CANCELLED' || raw.status === 'Cancelled' || st === 'CANCELED') status = 'Cancelled';

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || '',
    date: raw.date,
    time: raw.time || '17:00 - 19:00',
    location: raw.location,
    department: (raw.department?.name || raw.department || 'All Departments') as DepartmentName | 'All Departments',
    status,
    participantCount: raw.participantCount ?? (raw._count?.attendanceRecords ?? 0),
    capacity: raw.capacity ?? 60,
    creditReward: raw.creditReward ?? 20,
    mandatory: Boolean(raw.mandatory),
  };
}

/**
 * Fetches events from PostgreSQL with optional status, department, and search filters.
 */
export async function getEventsApi(filters?: {
  status?: string;
  departmentId?: string;
  department?: string;
  search?: string;
}): Promise<ClubEvent[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters?.departmentId && filters.departmentId !== 'All' && filters.departmentId !== 'All Departments') {
    params.append('departmentId', filters.departmentId);
  }
  if (filters?.department && filters.department !== 'All' && filters.department !== 'All Departments') {
    params.append('department', filters.department);
  }
  if (filters?.search) params.append('search', filters.search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/events${qs}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to fetch events from backend.');
  }

  return (payload.data || []).map(mapBackendEventToFrontend);
}

/**
 * Fetches single event by ID.
 */
export async function getEventByIdApi(id: string): Promise<ClubEvent> {
  const res = await fetch(`/api/events/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || `Event with id '${id}' not found.`);
  }

  return mapBackendEventToFrontend(payload.data);
}

/**
 * Creates a new event in PostgreSQL.
 */
export async function createEventApi(
  data: Omit<ClubEvent, 'id' | 'participantCount'>
): Promise<ClubEvent> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to create event.');
  }

  return mapBackendEventToFrontend(payload.data);
}

/**
 * Updates an existing event in PostgreSQL.
 */
export async function updateEventApi(
  id: string,
  updates: Partial<ClubEvent>
): Promise<ClubEvent> {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to update event.');
  }

  return mapBackendEventToFrontend(payload.data);
}

/**
 * Deletes an event in PostgreSQL.
 */
export async function deleteEventApi(id: string): Promise<{ id: string }> {
  const res = await fetch(`/api/events/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to delete event.');
  }

  return payload.data;
}
