import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDashboardMetrics,
  filterMembers,
  updateEventAttendance,
  getEventAttendanceSummary,
  applyCreditAdjustment,
  getLeaderboard,
  canManageDepartment,
  updateTaskStatus,
} from './clubLogic';
import {
  INITIAL_MEMBERS,
  INITIAL_EVENTS,
  INITIAL_ATTENDANCE,
  INITIAL_CREDITS,
  INITIAL_TASKS,
} from '../data/mockData';

test('calculateDashboardMetrics computes accurate totals and averages', () => {
  const metrics = calculateDashboardMetrics(INITIAL_MEMBERS, INITIAL_EVENTS);
  assert.equal(metrics.totalMembers, 12);
  assert.equal(metrics.upcomingEventsCount, 3);
  assert.ok(metrics.averageAttendance >= 80 && metrics.averageAttendance <= 95);
  assert.equal(metrics.totalCreditsDistributed, 2800);
});

test('filterMembers filters by search query, department, and role', () => {
  const techMembers = filterMembers(
    INITIAL_MEMBERS,
    '',
    'Technical & Engineering',
    'All'
  );
  assert.equal(techMembers.length, 4);

  const headsOnly = filterMembers(
    INITIAL_MEMBERS,
    '',
    'All',
    'Department Head'
  );
  assert.equal(headsOnly.length, 5);

  const searchSora = filterMembers(INITIAL_MEMBERS, 'sora', 'All', 'All');
  assert.equal(searchSora.length, 1);
  assert.equal(searchSora[0].name, 'Sora Takahashi');
});

test('updateEventAttendance updates record status and summary counts', () => {
  const beforeSummary = getEventAttendanceSummary(
    INITIAL_ATTENDANCE,
    INITIAL_MEMBERS,
    'evt-2'
  );
  assert.equal(beforeSummary.absentCount, 1);

  const { updatedRecords } = updateEventAttendance(
    INITIAL_ATTENDANCE,
    INITIAL_MEMBERS,
    'evt-2',
    'usr-11',
    'Present',
    'Elena Rostova'
  );

  const afterSummary = getEventAttendanceSummary(
    updatedRecords,
    INITIAL_MEMBERS,
    'evt-2'
  );
  assert.equal(afterSummary.absentCount, 0);
  assert.equal(afterSummary.presentRate, 100);
});

test('applyCreditAdjustment adds credits and creates a transaction record', () => {
  const { updatedMembers, updatedTransactions, targetMember } =
    applyCreditAdjustment(INITIAL_MEMBERS, INITIAL_CREDITS, {
      memberId: 'usr-5',
      delta: 25,
      reason: 'Completed API documentation',
      category: 'Task Completion',
      issuedBy: 'Elena Rostova',
    });

  assert.ok(targetMember);
  assert.equal(targetMember.totalCredits, 240);
  assert.equal(updatedTransactions.length, INITIAL_CREDITS.length + 1);
  assert.equal(updatedTransactions[0].delta, 25);
  assert.equal(updatedMembers.find((m) => m.id === 'usr-5')?.totalCredits, 240);
});

test('getLeaderboard sorts members descending by totalCredits', () => {
  const ranked = getLeaderboard(INITIAL_MEMBERS);
  assert.equal(ranked[0].name, 'Elena Rostova');
  assert.ok(ranked[0].totalCredits >= ranked[1].totalCredits);
});

test('canManageDepartment enforces role-based access control', () => {
  const admin = INITIAL_MEMBERS.find((m) => m.role === 'Admin')!;
  const techHead = INITIAL_MEMBERS.find(
    (m) => m.role === 'Department Head' && m.department === 'Technical & Engineering'
  )!;
  const member = INITIAL_MEMBERS.find((m) => m.role === 'Member')!;

  assert.equal(canManageDepartment(admin, 'Design & Creative'), true);
  assert.equal(canManageDepartment(techHead, 'Technical & Engineering'), true);
  assert.equal(canManageDepartment(techHead, 'Design & Creative'), false);
  assert.equal(canManageDepartment(member, 'Technical & Engineering'), false);
});

test('updateTaskStatus marks task completed and awards credits to assignee', () => {
  const task = INITIAL_TASKS.find((t) => t.id === 'tsk-1')!;
  const assigneeBefore = INITIAL_MEMBERS.find(
    (m) => m.id === task.assignedToId
  )!;

  const { updatedTasks, updatedMembers } = updateTaskStatus(
    INITIAL_TASKS,
    INITIAL_MEMBERS,
    'tsk-1',
    'Completed'
  );

  const updatedTask = updatedTasks.find((t) => t.id === 'tsk-1')!;
  const assigneeAfter = updatedMembers.find(
    (m) => m.id === task.assignedToId
  )!;

  assert.equal(updatedTask.status, 'Completed');
  assert.equal(
    assigneeAfter.totalCredits,
    assigneeBefore.totalCredits + task.creditValue
  );
});
