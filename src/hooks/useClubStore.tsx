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
  EventRegistration,
  PageRoute,
  UserRole,
  DepartmentName,
} from '../types';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_MEMBERS,
  INITIAL_EVENTS,
} from '../data/mockData';
import {
  calculateDashboardMetrics,
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
  getDepartmentsApi,
  changePasswordApi,
  getAllAttendanceApi,
  getEventAttendanceApi,
  markAttendanceApi,
  markAllPresentApi,
  getCreditTransactionsApi,
  adjustCreditsApi,
  getTasksApi,
  createTaskApi,
  updateTaskStatusApi,
  getActivitiesApi,
  getMyRegistrationsApi,
  getEventRegistrationsApi,
  registerForEventApi,
  cancelEventRegistrationApi,
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
  fetchDepartments: () => Promise<void>;
  members: User[];
  isLoadingMembers: boolean;
  membersError: string | null;
  fetchMembers: () => Promise<void>;
  viewingMember: User | null;
  setViewingMember: (member: User | null) => void;

  events: ClubEvent[];
  isLoadingEvents: boolean;
  eventsError: string | null;
  fetchEvents: () => Promise<void>;

  attendance: AttendanceRecord[];
  isLoadingAttendance: boolean;
  attendanceError: string | null;
  fetchAttendance: (eventId?: string) => Promise<void>;

  credits: CreditTransaction[];
  isLoadingCredits: boolean;
  creditsError: string | null;
  fetchCredits: () => Promise<void>;

  tasks: ClubTask[];
  isLoadingTasks: boolean;
  tasksError: string | null;
  fetchTasks: () => Promise<void>;

  activities: ActivityLog[];
  isLoadingActivities: boolean;
  activitiesError: string | null;
  fetchActivities: () => Promise<void>;

  myRegistrations: EventRegistration[];
  isLoadingRegistrations: boolean;
  registrationsError: string | null;
  fetchMyRegistrations: () => Promise<void>;
  registerForEvent: (eventId: string) => Promise<void>;
  cancelEventRegistration: (eventId: string) => Promise<void>;
  getEventRegistrations: (eventId: string) => Promise<{
    event: { id: string; title: string; capacity: number; department: string };
    registrations: EventRegistration[];
    count: number;
  }>;

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
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;

  markAttendance: (
    eventId: string,
    memberId: string,
    status: AttendanceStatus
  ) => Promise<void>;
  markAllPresentForEvent: (eventId: string) => Promise<void>;
  adjustMemberCredits: (params: {
    memberId: string;
    delta: number;
    reason: string;
    category: CreditTransaction['category'];
  }) => Promise<void>;
  addTask: (newTask: Omit<ClubTask, 'id'>) => Promise<ClubTask>;
  changeTaskStatus: (taskId: string, status: ClubTask['status']) => Promise<void>;
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

  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [viewingMember, setViewingMember] = useState<User | null>(null);

  const [events, setEvents] = useState<ClubEvent[]>(INITIAL_EVENTS);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [credits, setCredits] = useState<CreditTransaction[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [myRegistrations, setMyRegistrations] = useState<EventRegistration[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState<boolean>(false);
  const [registrationsError, setRegistrationsError] = useState<string | null>(null);

  /**
   * Fetches real departments with live member counts from PostgreSQL
   */
  const fetchDepartments = useCallback(async () => {
    try {
      const realDepts = await getDepartmentsApi();
      if (realDepts && realDepts.length > 0) {
        setDepartments(realDepts);
      }
    } catch (err) {
      console.warn('Failed to fetch departments from backend API:', err);
    }
  }, []);

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

  /**
   * Fetches real attendance records from PostgreSQL via Express API
   */
  const fetchAttendance = useCallback(async (eventId?: string) => {
    setIsLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const records = eventId
        ? await getEventAttendanceApi(eventId)
        : await getAllAttendanceApi();
      setAttendance(records);
    } catch (err: any) {
      console.warn('Failed to fetch attendance from API:', err);
      setAttendanceError(err.message || 'Failed to load attendance.');
    } finally {
      setIsLoadingAttendance(false);
    }
  }, []);

  /**
   * Fetches real credit transaction ledger from PostgreSQL via Express API
   */
  const fetchCredits = useCallback(async () => {
    setIsLoadingCredits(true);
    setCreditsError(null);
    try {
      const txs = await getCreditTransactionsApi();
      setCredits(txs);
    } catch (err: any) {
      console.warn('Failed to fetch credits from API:', err);
      setCreditsError(err.message || 'Failed to load credits.');
    } finally {
      setIsLoadingCredits(false);
    }
  }, []);

  /**
   * Fetches real tasks from PostgreSQL via Express API
   */
  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    setTasksError(null);
    try {
      const realTasks = await getTasksApi();
      setTasks(realTasks);
    } catch (err: any) {
      console.warn('Failed to fetch tasks from API:', err);
      setTasksError(err.message || 'Failed to load tasks.');
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  /**
   * Fetches real activity logs from PostgreSQL via Express API
   */
  const fetchActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const logs = await getActivitiesApi(40);
      setActivities(logs);
    } catch (err: any) {
      console.warn('Failed to fetch activities from API:', err);
      setActivitiesError(err.message || 'Failed to load activities.');
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  /**
   * Fetches real user event registrations from PostgreSQL via Express API
   */
  const fetchMyRegistrations = useCallback(async () => {
    setIsLoadingRegistrations(true);
    setRegistrationsError(null);
    try {
      const regs = await getMyRegistrationsApi();
      setMyRegistrations(regs);
    } catch (err: any) {
      console.warn('Failed to fetch my registrations:', err);
      setRegistrationsError(err.message || 'Failed to load registrations.');
    } finally {
      setIsLoadingRegistrations(false);
    }
  }, []);

  /**
   * Loads all database modules from PostgreSQL simultaneously
   */
  const loadAllDatabaseData = useCallback(async () => {
    await Promise.allSettled([
      fetchMembers(),
      fetchEvents(),
      fetchDepartments(),
      fetchAttendance(),
      fetchCredits(),
      fetchTasks(),
      fetchActivities(),
      fetchMyRegistrations(),
    ]);
  }, [
    fetchMembers,
    fetchEvents,
    fetchDepartments,
    fetchAttendance,
    fetchCredits,
    fetchTasks,
    fetchActivities,
    fetchMyRegistrations,
  ]);

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
        // Once authenticated, fetch real data from PostgreSQL
        await loadAllDatabaseData();
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
  }, [loadAllDatabaseData]);

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
    // Fetch all real database modules upon successful login
    await loadAllDatabaseData();
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
    fetchDepartments();
    fetchActivities();
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
    fetchDepartments();
    // If the active user updated their own profile, sync authenticatedUser
    if (authenticatedUser && authenticatedUser.id === id) {
      setAuthenticatedUser(updated);
    }
    fetchActivities();
    return updated;
  };

  /**
   * Soft-deactivates an existing member in PostgreSQL database through API (sets status to Alumni)
   */
  const deactivateMember = async (id: string): Promise<User> => {
    const deactivated = await deactivateMemberApi(id);
    setMembers((prev) => prev.map((m) => (m.id === id ? deactivated : m)));
    fetchDepartments();
    fetchActivities();
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
    fetchActivities();
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
    fetchActivities();
    return updated;
  };

  /**
   * Deletes an event in PostgreSQL database through API
   */
  const deleteEvent = async (id: string): Promise<void> => {
    await deleteEventApi(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    fetchActivities();
  };

  /**
   * Updates authenticated user password
   */
  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    await changePasswordApi(oldPassword, newPassword);
    fetchActivities();
  };

  /**
   * Marks member attendance in PostgreSQL database through API
   */
  const markAttendance = async (
    eventId: string,
    memberId: string,
    status: AttendanceStatus
  ): Promise<void> => {
    try {
      const result = await markAttendanceApi({ eventId, memberId, status });
      // Update local attendance state immediately
      setAttendance((prev) => {
        const index = prev.findIndex((r) => r.eventId === eventId && r.memberId === memberId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status,
            markedAt: result.markedAt,
            markedBy: result.markedBy,
          };
          return updated;
        }
        return [result, ...prev];
      });

      // Update member attendancePercentage if recalculated by backend
      if (result.attendancePercentage !== undefined) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, attendancePercentage: result.attendancePercentage! }
              : m
          )
        );
      }

      fetchActivities();
    } catch (err: any) {
      console.error('Failed to mark attendance in database:', err);
      throw err;
    }
  };

  /**
   * Marks all members present for an event in PostgreSQL database through API
   */
  const markAllPresentForEvent = async (eventId: string): Promise<void> => {
    try {
      await markAllPresentApi(eventId);
      await Promise.allSettled([fetchAttendance(), fetchMembers(), fetchActivities()]);
    } catch (err: any) {
      console.error('Failed to mark all members present in database:', err);
      throw err;
    }
  };

  /**
   * Adjusts member credits in PostgreSQL database through API
   */
  const adjustMemberCredits = async (params: {
    memberId: string;
    delta: number;
    reason: string;
    category: CreditTransaction['category'];
  }): Promise<void> => {
    try {
      const result = await adjustCreditsApi(params);
      setCredits((prev) => [result.transaction, ...prev]);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === params.memberId ? { ...m, totalCredits: result.newBalance } : m
        )
      );
      if (authenticatedUser && authenticatedUser.id === params.memberId) {
        setAuthenticatedUser((prev) =>
          prev ? { ...prev, totalCredits: result.newBalance } : prev
        );
      }
      fetchActivities();
    } catch (err: any) {
      console.error('Failed to adjust credits in database:', err);
      throw err;
    }
  };

  /**
   * Adds new task in PostgreSQL database through API
   */
  const addTask = async (newTaskData: Omit<ClubTask, 'id'>): Promise<ClubTask> => {
    try {
      const created = await createTaskApi(newTaskData);
      setTasks((prev) => [created, ...prev]);
      fetchActivities();
      return created;
    } catch (err: any) {
      console.error('Failed to create task in database:', err);
      throw err;
    }
  };

  /**
   * Updates task status in PostgreSQL database through API
   */
  const changeTaskStatus = async (
    taskId: string,
    status: ClubTask['status']
  ): Promise<void> => {
    try {
      const updated = await updateTaskStatusApi(taskId, status);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (status === 'Completed') {
        await Promise.allSettled([fetchMembers(), fetchCredits()]);
      }
      fetchActivities();
    } catch (err: any) {
      console.error('Failed to update task status in database:', err);
      throw err;
    }
  };

  /**
   * Registers currently authenticated user for an event in PostgreSQL
   */
  const registerForEvent = async (eventId: string): Promise<void> => {
    try {
      await registerForEventApi(eventId);
      await Promise.allSettled([
        fetchMyRegistrations(),
        fetchEvents(),
        fetchActivities(),
      ]);
    } catch (err: any) {
      console.error('Failed to register for event in database:', err);
      throw err;
    }
  };

  /**
   * Cancels user's event registration in PostgreSQL
   */
  const cancelEventRegistration = async (eventId: string): Promise<void> => {
    try {
      await cancelEventRegistrationApi(eventId);
      await Promise.allSettled([
        fetchMyRegistrations(),
        fetchEvents(),
        fetchActivities(),
      ]);
    } catch (err: any) {
      console.error('Failed to cancel event registration in database:', err);
      throw err;
    }
  };

  /**
   * Fetches event registrations list (Admin / Department Head)
   */
  const getEventRegistrations = async (eventId: string) => {
    return await getEventRegistrationsApi(eventId);
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
        fetchDepartments,
        members,
        isLoadingMembers,
        membersError,
        fetchMembers,
        viewingMember,
        setViewingMember,
        events,
        isLoadingEvents,
        eventsError,
        fetchEvents,
        attendance,
        isLoadingAttendance,
        attendanceError,
        fetchAttendance,
        credits,
        isLoadingCredits,
        creditsError,
        fetchCredits,
        tasks,
        isLoadingTasks,
        tasksError,
        fetchTasks,
        activities,
        isLoadingActivities,
        activitiesError,
        fetchActivities,
        myRegistrations,
        isLoadingRegistrations,
        registrationsError,
        fetchMyRegistrations,
        registerForEvent,
        cancelEventRegistration,
        getEventRegistrations,
        metrics,
        addMember,
        updateMember,
        deactivateMember,
        addEvent,
        updateEvent,
        deleteEvent,
        changePassword,
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
