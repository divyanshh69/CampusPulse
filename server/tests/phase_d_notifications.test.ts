import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db/prisma';

const BASE_URL = 'http://127.0.0.1:5001';
const DEFAULT_PASSWORD = 'campusPulse123!';

const tokenCache = new Map<string, string>();

async function loginUser(email: string, password = DEFAULT_PASSWORD): Promise<string> {
  if (tokenCache.has(email)) return tokenCache.get(email)!;
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { success: boolean; data?: { token: string } };
  if (!res.ok || !data.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  tokenCache.set(email, data.data.token);
  return data.data.token;
}

// -------------------------------------------------------------
// Test 1: Public Diagnostic Status Endpoint
// -------------------------------------------------------------
test('Phase D.1: Notification status endpoint is accessible without authentication and contains no sensitive data', async () => {
  const res = await fetch(`${BASE_URL}/api/notifications/status`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { success: boolean; data: { module: string; status: string; endpoints: string[] } };
  assert.equal(body.success, true);
  assert.equal(body.data.module, 'notifications');
  assert.equal(body.data.status, 'active');
  assert.ok(Array.isArray(body.data.endpoints));
  assert.ok(body.data.endpoints.includes('GET /api/notifications'));

  // Ensure no user information or credentials leaked
  const rawText = JSON.stringify(body);
  assert.ok(!rawText.includes('password'));
  assert.ok(!rawText.includes('email'));
  assert.ok(!rawText.includes('userId'));
});

// -------------------------------------------------------------
// Test 2: Unauthenticated Access Rejection (401)
// -------------------------------------------------------------
test('Phase D.2: Unauthenticated requests to notification endpoints are rejected with 401 Unauthorized', async () => {
  const listRes = await fetch(`${BASE_URL}/api/notifications`);
  assert.equal(listRes.status, 401);

  const countRes = await fetch(`${BASE_URL}/api/notifications/unread-count`);
  assert.equal(countRes.status, 401);

  const readAllRes = await fetch(`${BASE_URL}/api/notifications/read-all`, { method: 'PATCH' });
  assert.equal(readAllRes.status, 401);

  const singleReadRes = await fetch(`${BASE_URL}/api/notifications/any-id/read`, { method: 'PATCH' });
  assert.equal(singleReadRes.status, 401);

  const deleteRes = await fetch(`${BASE_URL}/api/notifications/any-id`, { method: 'DELETE' });
  assert.equal(deleteRes.status, 401);
});

// -------------------------------------------------------------
// Test 3: Authenticated Retrieval & Pagination Structure
// -------------------------------------------------------------
test('Phase D.3: Authenticated user can fetch their notifications with pagination metadata', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5

  // Seed a test notification for Liam directly if none exists
  await prisma.notification.create({
    data: {
      userId: 'usr-5',
      type: 'SYSTEM',
      title: 'Welcome to Notifications Test',
      message: 'Automated test verification notification.',
      relatedEntityId: 'sys-test-1',
      isRead: false,
    },
  });

  const res = await fetch(`${BASE_URL}/api/notifications?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    success: boolean;
    data: {
      notifications: Array<{ id: string; userId: string; title: string; message: string; type: string; isRead: boolean }>;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      unreadCount: number;
    };
  };

  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data.notifications));
  assert.ok(body.data.notifications.length >= 1);
  assert.ok(body.data.pagination);
  assert.equal(body.data.pagination.page, 1);
  assert.equal(body.data.pagination.limit, 10);
  assert.ok(body.data.pagination.total >= 1);
  assert.ok(typeof body.data.unreadCount === 'number');

  // Verify all returned notifications belong to Liam (usr-5)
  for (const n of body.data.notifications) {
    assert.equal(n.userId, 'usr-5');
  }
});

// -------------------------------------------------------------
// Test 4: Unread Count Endpoint Accuracy
// -------------------------------------------------------------
test('Phase D.4: Unread count endpoint returns accurate count matching database', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5

  // Count unread notifications in database for usr-5
  const expectedCount = await prisma.notification.count({
    where: { userId: 'usr-5', isRead: false },
  });

  const res = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as { success: boolean; data: { unreadCount: number } };
  assert.equal(body.success, true);
  assert.equal(body.data.unreadCount, expectedCount);
});

// -------------------------------------------------------------
// Test 5: Mark Single Notification As Read
// -------------------------------------------------------------
test('Phase D.5: Authenticated user can mark their own notification as read', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5

  // Create an unread notification for Liam
  const testNote = await prisma.notification.create({
    data: {
      userId: 'usr-5',
      type: 'TASK',
      title: 'Task Assignment Test Note',
      message: 'Please complete the assigned task.',
      isRead: false,
    },
  });

  const res = await fetch(`${BASE_URL}/api/notifications/${testNote.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as { success: boolean; data: { id: string; isRead: boolean } };
  assert.equal(body.success, true);
  assert.equal(body.data.id, testNote.id);
  assert.equal(body.data.isRead, true);

  // Verify database record updated
  const inDb = await prisma.notification.findUnique({ where: { id: testNote.id } });
  assert.equal(inDb?.isRead, true);
});

// -------------------------------------------------------------
// Test 6: IDOR Protection on Mark As Read
// -------------------------------------------------------------
test('Phase D.6: IDOR Protection: User cannot mark another user notification as read', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5
  const mateoToken = await loginUser('mateo.silva@university.edu'); // usr-9

  // Create notification specifically for Mateo (usr-9)
  const mateoNote = await prisma.notification.create({
    data: {
      userId: 'usr-9',
      type: 'EVENT',
      title: "Mateo's Private Notification",
      message: 'Design system meeting.',
      isRead: false,
    },
  });

  // Liam attempts to mark Mateo's notification as read
  const hackRes = await fetch(`${BASE_URL}/api/notifications/${mateoNote.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  // Should return 404 (not found in user scope) or 403 (forbidden)
  assert.ok(hackRes.status === 404 || hackRes.status === 403);

  // Verify database status remains unread
  const freshDb = await prisma.notification.findUnique({ where: { id: mateoNote.id } });
  assert.equal(freshDb?.isRead, false);

  // Mateo can mark it read successfully
  const validRes = await fetch(`${BASE_URL}/api/notifications/${mateoNote.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${mateoToken}` },
  });
  assert.equal(validRes.status, 200);
});

// -------------------------------------------------------------
// Test 7: IDOR Protection on Delete Notification
// -------------------------------------------------------------
test('Phase D.7: IDOR Protection: User cannot delete another user notification', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5
  const mateoToken = await loginUser('mateo.silva@university.edu'); // usr-9

  // Create notification for Mateo
  const mateoNote = await prisma.notification.create({
    data: {
      userId: 'usr-9',
      type: 'CREDIT',
      title: "Mateo's Credit Award",
      message: '+5 credits awarded.',
      isRead: false,
    },
  });

  // Liam attempts to delete Mateo's notification
  const hackRes = await fetch(`${BASE_URL}/api/notifications/${mateoNote.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.ok(hackRes.status === 404 || hackRes.status === 403);

  // Verify it still exists in database
  const stillExists = await prisma.notification.findUnique({ where: { id: mateoNote.id } });
  assert.ok(stillExists !== null);

  // Mateo deletes it successfully
  const validRes = await fetch(`${BASE_URL}/api/notifications/${mateoNote.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${mateoToken}` },
  });
  assert.equal(validRes.status, 200);

  // Verify deleted from database
  const nowGone = await prisma.notification.findUnique({ where: { id: mateoNote.id } });
  assert.equal(nowGone, null);
});

// -------------------------------------------------------------
// Test 8: Mark All Notifications As Read
// -------------------------------------------------------------
test('Phase D.8: Mark all notifications as read updates only authenticated user unread records', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5

  // Create 3 unread notifications for Liam
  await prisma.notification.createMany({
    data: [
      { userId: 'usr-5', type: 'SYSTEM', title: 'Batch Note 1', message: 'Test 1', isRead: false },
      { userId: 'usr-5', type: 'SYSTEM', title: 'Batch Note 2', message: 'Test 2', isRead: false },
      { userId: 'usr-5', type: 'SYSTEM', title: 'Batch Note 3', message: 'Test 3', isRead: false },
    ],
  });

  // Create 1 unread notification for Mateo to ensure it is NOT affected
  const mateoNote = await prisma.notification.create({
    data: { userId: 'usr-9', type: 'SYSTEM', title: "Mateo Unaffected", message: 'Stay unread', isRead: false },
  });

  const res = await fetch(`${BASE_URL}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as { success: boolean; data: { count: number } };
  assert.equal(body.success, true);
  assert.ok(body.data.count >= 3);

  // Verify Liam has 0 unread
  const liamUnreadCount = await prisma.notification.count({
    where: { userId: 'usr-5', isRead: false },
  });
  assert.equal(liamUnreadCount, 0);

  // Verify Mateo's notification is still unread
  const mateoCheck = await prisma.notification.findUnique({ where: { id: mateoNote.id } });
  assert.equal(mateoCheck?.isRead, false);
});

// -------------------------------------------------------------
// Test 9: Query Filtering (by isRead and by type)
// -------------------------------------------------------------
test('Phase D.9: Notification query filtering by isRead and type works as expected', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5

  // Insert known test notifications
  await prisma.notification.create({
    data: { userId: 'usr-5', type: 'ATTENDANCE', title: 'Attendance Test Filter', message: 'Present', isRead: true },
  });
  await prisma.notification.create({
    data: { userId: 'usr-5', type: 'CREDIT', title: 'Credit Test Filter', message: '+10', isRead: false },
  });

  // Filter isRead=false
  const unreadRes = await fetch(`${BASE_URL}/api/notifications?isRead=false`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(unreadRes.status, 200);
  const unreadData = (await unreadRes.json()) as { data: { notifications: Array<{ isRead: boolean }> } };
  assert.ok(Array.isArray(unreadData.data.notifications));
  for (const n of unreadData.data.notifications) {
    assert.equal(n.isRead, false);
  }

  // Filter type=ATTENDANCE
  const typeRes = await fetch(`${BASE_URL}/api/notifications?type=ATTENDANCE`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(typeRes.status, 200);
  const typeData = (await typeRes.json()) as { data: { notifications: Array<{ type: string }> } };
  assert.ok(Array.isArray(typeData.data.notifications));
  for (const n of typeData.data.notifications) {
    assert.equal(n.type, 'ATTENDANCE');
  }
});

// -------------------------------------------------------------
// Test 10: System Integration - Event Creation Triggers Notifications
// -------------------------------------------------------------
test('Phase D.10: Creating a department-scoped event creates notifications for department members only', async () => {
  const marcusToken = await loginUser('marcus.vance@university.edu'); // Dept Head of Tech (dept-tech)

  const eventTitle = `Tech Hackathon ${Date.now()}`;

  const res = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({
      title: eventTitle,
      description: 'Department hackathon for Technology members.',
      category: 'Workshop',
      date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '16:00',
      location: 'Engineering Lab 401',
      capacity: 30,
      departmentId: 'dept-tech', // Tech department
    }),
  });

  assert.equal(res.status, 201);
  const eventBody = (await res.json()) as { data: { id: string } };
  const eventId = eventBody.data.id;

  // Liam (usr-5, Tech) should receive an EVENT notification
  const liamNotification = await prisma.notification.findFirst({
    where: {
      userId: 'usr-5',
      type: 'EVENT',
      relatedEntityId: eventId,
    },
  });
  assert.ok(liamNotification !== null, 'Tech member Liam should receive notification');
  assert.match(liamNotification.message, new RegExp(eventTitle));

  // Mateo (usr-9, Design dept-design) should NOT receive this notification
  const mateoNotification = await prisma.notification.findFirst({
    where: {
      userId: 'usr-9',
      type: 'EVENT',
      relatedEntityId: eventId,
    },
  });
  assert.equal(mateoNotification, null, 'Design member Mateo must not receive Tech-scoped event notification');
});

// -------------------------------------------------------------
// Test 11: System Integration - Event RSVP Confirmation Notification
// -------------------------------------------------------------
test('Phase D.11: Member RSVP registration triggers an in-app confirmation notification', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5

  // Ensure Liam is not registered for evt-2
  await fetch(`${BASE_URL}/api/events/evt-2/register`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  // Clear any existing registration notification for Liam and evt-2
  await prisma.notification.deleteMany({
    where: {
      userId: 'usr-5',
      type: 'REGISTRATION',
      relatedEntityId: 'evt-2',
    },
  });

  // Register Liam for evt-2
  const regRes = await fetch(`${BASE_URL}/api/events/evt-2/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(regRes.status, 201);

  // Check notification in database
  const rsvpNotification = await prisma.notification.findFirst({
    where: {
      userId: 'usr-5',
      type: 'REGISTRATION',
      relatedEntityId: 'evt-2',
    },
  });

  assert.ok(rsvpNotification !== null, 'Registration confirmation notification must exist');
  assert.match(rsvpNotification.title, /RSVP Confirmed/i);
  assert.equal(rsvpNotification.isRead, false);
});

// -------------------------------------------------------------
// Test 12: System Integration - Event Cancellation Notification
// -------------------------------------------------------------
test('Phase D.12: Cancelling an event notifies all registered participants', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu'); // usr-5

  // Create a throwaway event
  const tempTitle = `Cancel Test Event ${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: tempTitle,
      description: 'Event to test cancellation notification.',
      category: 'Social',
      date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '15:00',
      location: 'Student Lounge',
      capacity: 25,
      departmentId: null,
    }),
  });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()) as { data: { id: string } };
  const eventId = created.data.id;

  // Liam registers for this event
  const regRes = await fetch(`${BASE_URL}/api/events/${eventId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(regRes.status, 201);

  // Admin cancels the event via PATCH /api/events/:id with status: 'Cancelled'
  const cancelRes = await fetch(`${BASE_URL}/api/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'Cancelled' }),
  });
  assert.equal(cancelRes.status, 200);

  // Verify Liam received an event cancellation notification
  const cancelNotification = await prisma.notification.findFirst({
    where: {
      userId: 'usr-5',
      type: 'EVENT',
      title: 'Event Cancelled',
      relatedEntityId: eventId,
    },
  });

  assert.ok(cancelNotification !== null, 'Liam should be notified of event cancellation');
  assert.match(cancelNotification.message, /has been cancelled/i);
});

// -------------------------------------------------------------
// Test 13: System Integration - Task Assignment Notification
// -------------------------------------------------------------
test('Phase D.13: Assigning a task creates a TASK notification for the assigned member', async () => {
  const marcusToken = await loginUser('marcus.vance@university.edu'); // Dept Head of Tech

  const taskTitle = `Build API Router ${Date.now()}`;
  const taskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({
      title: taskTitle,
      description: 'Implement notification service handlers',
      departmentId: 'dept-tech',
      assignedToId: 'usr-5', // Liam
      deadline: '2026-12-01',
      priority: 'High',
      creditValue: 15,
    }),
  });

  assert.equal(taskRes.status, 201);
  const created = (await taskRes.json()) as { data: { id: string } };

  // Verify Liam received the notification
  const taskNote = await prisma.notification.findFirst({
    where: {
      userId: 'usr-5',
      type: 'TASK',
      relatedEntityId: created.data.id,
    },
  });

  assert.ok(taskNote !== null, 'Assignee should receive task assignment notification');
  assert.match(taskNote.message, new RegExp(taskTitle));
});

// -------------------------------------------------------------
// Test 14: System Integration - Task Completion Notification
// -------------------------------------------------------------
test('Phase D.14: Completing a task generates notification confirming credit reward', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  // Create a task directly in database for testing completion flow
  const testTask = await prisma.clubTask.create({
    data: {
      title: `Audit Security Protocols ${Date.now()}`,
      description: 'Perform security code review',
      departmentId: 'dept-tech',
      assignedToId: 'usr-5',
      deadline: '2026-12-05',
      priority: 'HIGH',
      creditValue: 20,
      status: 'IN_PROGRESS',
    },
  });

  // Admin marks the task as Completed
  const completeRes = await fetch(`${BASE_URL}/api/tasks/${testTask.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'Completed' }),
  });

  assert.equal(completeRes.status, 200);

  // Verify Liam received task completion notification
  const compNote = await prisma.notification.findFirst({
    where: {
      userId: 'usr-5',
      type: 'TASK',
      relatedEntityId: testTask.id,
      title: 'Task Completed',
    },
  });

  assert.ok(compNote !== null, 'Assignee should receive task completed notification');
  assert.match(compNote.message, /20 credits awarded/i);
});

// -------------------------------------------------------------
// Test 15: System Integration - Credit Adjustment Notification
// -------------------------------------------------------------
test('Phase D.15: Awarding credits to a member creates an in-app CREDIT notification', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  const creditRes = await fetch(`${BASE_URL}/api/credits/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      memberId: 'usr-5', // Liam
      delta: 25,
      category: 'Leadership Bonus',
      reason: 'Outstanding technical contribution during Phase D',
    }),
  });

  assert.equal(creditRes.status, 200);

  // Check notification in database
  const creditNote = await prisma.notification.findFirst({
    where: {
      userId: 'usr-5',
      type: 'CREDIT',
      title: 'Credits Awarded',
    },
    orderBy: { createdAt: 'desc' },
  });

  assert.ok(creditNote !== null, 'Recipient must receive credit award notification');
  assert.match(creditNote.message, /Outstanding technical contribution/i);
});

// -------------------------------------------------------------
// Test 16: System Integration - Attendance Notification
// -------------------------------------------------------------
test('Phase D.16: Marking attendance triggers an in-app ATTENDANCE notification', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  const attRes = await fetch(`${BASE_URL}/api/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      eventId: 'evt-1',
      memberId: 'usr-5',
      status: 'Present',
    }),
  });

  assert.equal(attRes.status, 200);

  // Verify Liam received attendance notification
  const attNote = await prisma.notification.findFirst({
    where: {
      userId: 'usr-5',
      type: 'ATTENDANCE',
      relatedEntityId: 'evt-1',
    },
  });

  assert.ok(attNote !== null, 'Member should receive attendance notification');
  assert.match(attNote.message, /marked as Present/i);
});
