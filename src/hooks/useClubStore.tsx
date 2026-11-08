import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  User,
  Department,
  ClubEvent,
  AttendanceRecord,
  AttendanceStatus,
  CreditTransaction,
  ClubTask,
  ActivityLog,
  PageRoute,
  UserRole,
  DepartmentName,
} from '../types';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_MEMBERS,
  INITIAL_EVENTS,
  INITIAL_ATTENDANCE,
  INITIAL_CREDITS,
  INITIAL_TASKS,
  INITIAL_ACTIVITIES,
} from '../data/mockData';
import {
  calculateDashboardMetrics,
  updateEventAttendance,
  applyCreditAdjustment,
  updateTaskStatus,
  DashboardMetrics,
} from '../utils/clubLogic';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  loginApi,
  getCurrentUserApi,
  getMembersApi,
  createMemberApi,
  updateMemberApi,
  deactivateMemberApi,
  getEventsApi,
  createEventApi,
  updateEventApi,
  deleteEventApi,
} from '../services/api';

interface ClubStoreContextValue {
  currentPage: PageRoute;
  setCurrentPage: (page: PageRoute) => void;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  currentUser: User;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchUserById: (userId: string) => void;
  loginAsRole?: (role: UserRole, email?: string) => void;

  departments: Department[];
  members: User[];
  isLoadingMembers: boolean;
  membersError: string | null;
  fetchMembers: () => Promise<void>;

  events: ClubEvent[];
  isLoadingEvents: boolean;
  eventsError: string | null;
  fetchEvents: () => Promise<void>;
  attendance: AttendanceRecord[];
  credits: CreditTransaction[];
  tasks: ClubTask[];
  activities: ActivityLog[];
  metrics: DashboardMetrics;

  addMember: (
    newMember: Omit<
      User,
      'id' | 'attendancePercentage' | 'totalCredits' | 'joinedDate' | 'status'
    >
  ) => Promise<User>;
  updateMember: (id: string, updates: Partial<User>) => Promise<User>;
  deactivateMember: (id: string) => Promise<User>;

  addEvent: (
    newEvent: Omit<ClubEvent, 'id' | 'participantCount'>
  ) => Promise<ClubEvent>;
  updateEvent: (
    id: string,
    updates: Partial<ClubEvent>
  ) => Promise<ClubEvent>;
  deleteEvent: (id: string) => Promise<void>;
  markAttendance: (
    eventId: string,
    memberId: string,
    status: AttendanceStatus
  ) => void;
  markAllPresentForEvent: (eventId: string) => void;
  adjustMemberCredits: (params: {
    memberId: string;
    delta: number;
    reason: string;
    category: CreditTransaction['category'];
  }) => void;
  addTask: (newTask: Omit<ClubTask, 'id'>) => void;
  changeTaskStatus: (taskId: string, status: ClubTask['status']) => void;
}

const ClubStoreContext = createContext<ClubStoreContextValue | null>(null);

export const ClubStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialToken = getStoredToken();
  const [currentPage, setCurrentPage] = useState<PageRoute>(
    initialToken ? 'dashboard' : 'login'
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(initialToken));
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(initialToken);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);

  // Members state loaded from PostgreSQL database
  const [members, setMembers] = useState<User[]>(INITIAL_MEMBERS);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [events, setEvents] = useState<ClubEvent[]>(INITIAL_EVENTS);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [credits, setCredits] = useState<CreditTransaction[]>(INITIAL_CREDITS);
  const [tasks, setTasks] = useState<ClubTask[]>(INITIAL_TASKS);
  const [activities, setActivities] = useState<ActivityLog[]>(INITIAL_ACTIVITIES);

  /**
   * Fetches real members from PostgreSQL via Express API
   */
  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const realMembers = await getMembersApi();
      setMembers(realMembers);
    } catch (err: any) {
      console.error('Failed to fetch members from backend API:', err);
      setMembersError(err.message || 'Failed to load members from database.');
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  /**
   * Fetches real events from PostgreSQL via Express API
   */
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventsError(null);
    try {
      const realEvents = await getEventsApi();
      setEvents(realEvents);
    } catch (err: any) {
      console.error('Failed to fetch events from backend API:', err);
      setEventsError(err.message || 'Failed to load events from database.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  // Restore authentication session from token on application startup
  useEffect(() => {
    async function restoreSession() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setCurrentPage('login');
        return;
      }

      try {
        const user = await getCurrentUserApi(storedToken);
        setAuthenticatedUser(user);
        setToken(storedToken);
        setIsAuthenticated(true);
        setCurrentPage((prev) => (prev === 'login' ? 'dashboard' : prev));
        // Once authenticated, fetch real members and events from PostgreSQL
        fetchMembers();
        fetchEvents();
      } catch (err) {
        console.warn('Session restoration failed or token expired:', err);
        removeStoredToken();
        setToken(null);
        setAuthenticatedUser(null);
        setIsAuthenticated(false);
        setCurrentPage('login');
      } finally {
        setIsLoadingAuth(false);
      }
    }

    restoreSession();
  }, [fetchMembers, fetchEvents]);

  const currentUser = useMemo<User>(() => {
    if (authenticatedUser) {
      return authenticatedUser;
    }
    return members[0];
  }, [authenticatedUser, members]);

  const metrics = useMemo(
    () => calculateDashboardMetrics(members, events),
    [members, events]
  );

  const logActivity = (
    action: string,
    target: string,
    category: ActivityLog['category']
  ) => {
    const entry: ActivityLog = {
      id: `act-${Date.now()}`,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      target,
      timestamp: 'Just now',
      category,
    };
    setActivities((prev) => [entry, ...prev]);
  };

  /**
   * Real backend authentication login
   */
  const login = async (email: string, password: string): Promise<void> => {
    const result = await loginApi(email, password);
    setStoredToken(result.token);
    setToken(result.token);
    setAuthenticatedUser(result.user);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    // Fetch real members and events upon successful login
    fetchMembers();
    fetchEvents();
  };

  /**
   * Real logout: clears token and local state, redirects to login
   */
  const logout = () => {
    removeStoredToken();
    setToken(null);
    setAuthenticatedUser(null);
    setIsAuthenticated(false);
    setCurrentPage('login');
  };

  /**
   * Safe route setter preventing unauthenticated page access
   */
  const handleSetCurrentPage = (page: PageRoute) => {
    if (!isAuthenticated && page !== 'login') {
      setCurrentPage('login');
      return;
    }
    setCurrentPage(page);
  };

  /**
   * Legacy mock switcher - disabled in authenticated mode to prevent permission escalation
   */
  const switchUserById = (_userId: string) => {
    // Disabled in authenticated mode: permissions are strictly governed by backend auth
  };

  /**
   * Adds a new member to PostgreSQL database through API
   */
  const addMember = async (
    newMemberData: Omit<
      User,
      'id' | 'attendancePercentage' | 'totalCredits' | 'joinedDate' | 'status'
    >
  ): Promise<User> => {
    const created = await createMemberApi({
      name: newMemberData.name,
      email: newMemberData.email,
      studentId: newMemberData.studentId,
      major: newMemberData.major,
      departmentId: newMemberData.departmentId || newMemberData.department,
      role: newMemberData.role,
      academicYear: newMemberData.academicYear,
      bio: newMemberData.bio,
    });

    setMembers((prev) => [created, ...prev]);
    logActivity(
      'Onboarded new member',
      `${created.name} (${created.department})`,
      'member'
    );
    return created;
  };

  /**
   * Updates an existing member in PostgreSQL database through API
   */
  const updateMember = async (
    id: string,
    updates: Partial<User>
  ): Promise<User> => {
    const updated = await updateMemberApi(id, updates);
    setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    // If the active user updated their own profile, sync authenticatedUser
    if (authenticatedUser && authenticatedUser.id === id) {
      setAuthenticatedUser(updated);
    }
    logActivity(
      'Updated member record for',
      `${updated.name} (${updated.department})`,
      'member'
    );
    return updated;
  };

  /**
   * Soft-deactivates an existing member in PostgreSQL database through API (sets status to Alumni)
   */
  const deactivateMember = async (id: string): Promise<User> => {
    const deactivated = await deactivateMemberApi(id);
    setMembers((prev) => prev.map((m) => (m.id === id ? deactivated : m)));
    logActivity(
      'Deactivated member (marked as Alumni)',
      `${deactivated.name} (${deactivated.department})`,
      'member'
    );
    return deactivated;
  };

  /**
   * Adds a new event to PostgreSQL database through API
   */
  const addEvent = async (
    newEventData: Omit<ClubEvent, 'id' | 'participantCount'>
  ): Promise<ClubEvent> => {
    const created = await createEventApi(newEventData);
    setEvents((prev) => [created, ...prev]);
    logActivity('Scheduled new event', created.title, 'event');
    return created;
  };

  /**
   * Updates an existing event in PostgreSQL database through API
   */
  const updateEvent = async (
    id: string,
    updates: Partial<ClubEvent>
  ): Promise<ClubEvent> => {
    const updated = await updateEventApi(id, updates);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    logActivity('Updated event details', updated.title, 'event');
    return updated;
  };

  /**
   * Deletes an event in PostgreSQL database through API
   */
  const deleteEvent = async (id: string): Promise<void> => {
    await deleteEventApi(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    logActivity('Deleted event', `Event ID: ${id}`, 'event');
  };

  const markAttendance = (
    eventId: string,
    memberId: string,
    status: AttendanceStatus
  ) => {
    const result = updateEventAttendance(
      attendance,
      members,
      eventId,
      memberId,
      status,
      currentUser.name
    );
    setAttendance(result.updatedRecords);
    setMembers(result.updatedMembers);

    const targetMember = members.find((m) => m.id === memberId);
    const targetEvent = events.find((e) => e.id === eventId);
    if (targetMember && targetEvent) {
      logActivity(
        `Marked ${status.toLowerCase()} for`,
        `${targetMember.name} · ${targetEvent.title}`,
        'attendance'
      );
    }
  };

  const markAllPresentForEvent = (eventId: string) => {
    let currentRecords = [...attendance];
    let currentMembers = [...members];
    for (const member of currentMembers) {
      const res = updateEventAttendance(
        currentRecords,
        currentMembers,
        eventId,
        member.id,
        'Present',
        currentUser.name
      );
      currentRecords = res.updatedRecords;
      currentMembers = res.updatedMembers;
    }
    setAttendance(currentRecords);
    setMembers(currentMembers);
    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent) {
      logActivity(
        'Marked full roster Present for',
        targetEvent.title,
        'attendance'
      );
    }
  };

  const adjustMemberCredits = (params: {
    memberId: string;
    delta: number;
    reason: string;
    category: CreditTransaction['category'];
  }) => {
    const result = applyCreditAdjustment(members, credits, {
      ...params,
      issuedBy: currentUser.name,
    });
    if (result.targetMember) {
      setMembers(result.updatedMembers);
      setCredits(result.updatedTransactions);
      const sign = params.delta > 0 ? `+${params.delta}` : `${params.delta}`;
      logActivity(
        `Recorded ${sign} credits for`,
        `${result.targetMember.name} (${params.reason})`,
        'credit'
      );
    }
  };

  const addTask = (newTaskData: Omit<ClubTask, 'id'>) => {
    const created: ClubTask = {
      ...newTaskData,
      id: `tsk-${Date.now()}`,
    };
    setTasks((prev) => [created, ...prev]);
    logActivity(
      'Assigned new task to',
      `${created.assignedToName} (${created.title})`,
      'task'
    );
  };

  const changeTaskStatus = (taskId: string, status: ClubTask['status']) => {
    const result = updateTaskStatus(tasks, members, taskId, status);
    setTasks(result.updatedTasks);
    setMembers(result.updatedMembers);
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      logActivity(
        `Updated task status to ${status} for`,
        targetTask.title,
        'task'
      );
    }
  };

  return (
    <ClubStoreContext.Provider
      value={{
        currentPage,
        setCurrentPage: handleSetCurrentPage,
        isAuthenticated,
        isLoadingAuth,
        currentUser,
        token,
        login,
        logout,
        switchUserById,
        departments,
        members,
        isLoadingMembers,
        membersError,
        fetchMembers,
        events,
        isLoadingEvents,
        eventsError,
        fetchEvents,
        attendance,
        credits,
        tasks,
        activities,
        metrics,
        addMember,
        updateMember,
        deactivateMember,
        addEvent,
        updateEvent,
        deleteEvent,
        markAttendance,
        markAllPresentForEvent,
        adjustMemberCredits,
        addTask,
        changeTaskStatus,
      }}
    >
      {children}
    </ClubStoreContext.Provider>
  );
};

export function useClubStore(): ClubStoreContextValue {
  const ctx = useContext(ClubStoreContext);
  if (!ctx) {
    throw new Error('useClubStore must be used within a ClubStoreProvider');
  }
  return ctx;
}

export const ALL_DEPARTMENTS: DepartmentName[] = [
  'Technical & Engineering',
  'Design & Creative',
  'Events & Operations',
  'Outreach & Sponsorships',
  'Content & Editorial',
];
