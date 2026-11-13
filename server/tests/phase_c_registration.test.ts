import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db/prisma';

const BASE_URL = 'http://localhost:5001';
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

test('1. Member can register for an eligible event', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Cancel any prior registration first for clean slate
  await fetch(`${BASE_URL}/api/events/evt-1/register`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  // Register Liam for Autumn Systems Architecture Workshop (evt-1)
  const regRes = await fetch(`${BASE_URL}/api/events/evt-1/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(regRes.status, 201);
  const data = (await regRes.json()) as { success: boolean; data: { status: string; eventId: string } };
  assert.equal(data.success, true);
  assert.equal(data.data.status, 'REGISTERED');
  assert.equal(data.data.eventId, 'evt-1');
});

test('2. Duplicate event registration is rejected with 409 Conflict', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Attempt second registration for evt-1
  const dupRes = await fetch(`${BASE_URL}/api/events/evt-1/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(dupRes.status, 409);
  const data = (await dupRes.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
  assert.match(data.message, /already registered/i);
});

test('3. Member can cancel their own registration', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu');

  const cancelRes = await fetch(`${BASE_URL}/api/events/evt-1/register`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(cancelRes.status, 200);
  const data = (await cancelRes.json()) as { success: boolean; data: { status: string } };
  assert.equal(data.success, true);
  assert.equal(data.data.status, 'CANCELLED');

  // Attempting to cancel again should fail since no active registration remains
  const repeatCancel = await fetch(`${BASE_URL}/api/events/evt-1/register`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(repeatCancel.status, 400);
});

test('4. Unauthenticated requests are rejected with 401 Unauthorized', async () => {
  const endpoints = [
    { url: `${BASE_URL}/api/events/my-registrations`, method: 'GET' },
    { url: `${BASE_URL}/api/events/evt-1/registrations`, method: 'GET' },
    { url: `${BASE_URL}/api/events/evt-1/register`, method: 'POST' },
    { url: `${BASE_URL}/api/events/evt-1/register`, method: 'DELETE' },
  ];

  for (const ep of endpoints) {
    const res = await fetch(ep.url, { method: ep.method });
    assert.equal(res.status, 401, `Expected 401 for ${ep.method} ${ep.url}`);
    const data = (await res.json()) as { success: boolean };
    assert.equal(data.success, false);
  }
});

test('5. Department Head cannot view registrations for another department\'s event', async () => {
  // Sora Takahashi (usr-3) is Head of Design & Creative (dept-design)
  const soraToken = await loginUser('sora.takahashi@university.edu');

  // evt-1 belongs to Technical & Engineering (dept-tech)
  const res = await fetch(`${BASE_URL}/api/events/evt-1/registrations`, {
    headers: { Authorization: `Bearer ${soraToken}` },
  });

  assert.equal(res.status, 403);
  const data = (await res.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
  assert.match(data.message, /events in (their|your) own department/i);
});

test('6. Regular member cannot view full event registration participant list', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu');

  const res = await fetch(`${BASE_URL}/api/events/evt-1/registrations`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  assert.equal(res.status, 403);
  const data = (await res.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
  assert.match(data.message, /regular members cannot access participant lists/i);
});

test('7. Event capacity prevents additional registrations when full', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');
  const amaraToken = await loginUser('amara.okafor@university.edu');

  // Create an event with capacity = 1
  const testEventRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Capacity Cap Test Event ${Date.now()}`,
      description: 'Exclusive 1-person seminar',
      date: '2026-12-20',
      time: '14:00 - 15:00',
      location: 'Lab 204',
      capacity: 1,
      creditReward: 15,
      mandatory: false,
    }),
  });
  assert.equal(testEventRes.status, 201);
  const testEvent = (await testEventRes.json()).data;

  // First member registers: should succeed
  const reg1Res = await fetch(`${BASE_URL}/api/events/${testEvent.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(reg1Res.status, 201);

  // Second member attempts to register: should fail due to capacity
  const reg2Res = await fetch(`${BASE_URL}/api/events/${testEvent.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${amaraToken}` },
  });
  assert.equal(reg2Res.status, 400);
  const reg2Data = (await reg2Res.json()) as { success: boolean; message: string };
  assert.equal(reg2Data.success, false);
  assert.match(reg2Data.message, /full capacity/i);
});

test('8. Cannot register for a cancelled event', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Create and immediately cancel an event
  const createRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Cancelled Event Test ${Date.now()}`,
      description: 'Will be cancelled',
      date: '2026-12-22',
      time: '10:00 - 11:00',
      location: 'Hall B',
      capacity: 50,
      creditReward: 10,
    }),
  });
  const event = (await createRes.json()).data;

  await fetch(`${BASE_URL}/api/events/${event.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'Cancelled' }),
  });

  // Attempt registration on cancelled event
  const regRes = await fetch(`${BASE_URL}/api/events/${event.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(regRes.status, 400);
  const regData = (await regRes.json()) as { success: boolean; message: string };
  assert.equal(regData.success, false);
  assert.match(regData.message, /cancelled event/i);
});

test('9. Registrations persist in PostgreSQL and appear in my-registrations', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Clean slate: ensure Liam is not registered for evt-2
  await fetch(`${BASE_URL}/api/events/evt-2/register`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  // Register Liam for General Body Assembly (evt-2)
  const regRes = await fetch(`${BASE_URL}/api/events/evt-2/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(regRes.status, 201);

  // Fetch my-registrations
  const myRegsRes = await fetch(`${BASE_URL}/api/events/my-registrations`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(myRegsRes.status, 200);
  const myRegsData = (await myRegsRes.json()).data as Array<{ eventId: string; status: string; event: { title: string } }>;
  const found = myRegsData.find((r) => r.eventId === 'evt-2');
  assert.ok(found, 'Registration for evt-2 must persist in PostgreSQL');
  assert.equal(found.status, 'REGISTERED');
  assert.ok(found.event.title, 'Event details must be included in my-registrations response');
});

test('10. Registration and cancellation generate activity logs in PostgreSQL', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Register Liam for Industry Sponsor Mixer (evt-3)
  await fetch(`${BASE_URL}/api/events/evt-3/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  // Cancel registration
  await fetch(`${BASE_URL}/api/events/evt-3/register`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  // Fetch activity logs
  const actRes = await fetch(`${BASE_URL}/api/activities?limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(actRes.status, 200);
  const logs = (await actRes.json()).data as Array<{ action: string; target: string; category: string }>;

  const hasRegLog = logs.some(
    (l) => l.action === 'Registered for event' && l.category === 'event'
  );
  const hasCancelLog = logs.some(
    (l) => l.action === 'Cancelled event registration' && l.category === 'event'
  );

  assert.ok(hasRegLog, 'Activity log for event registration must exist');
  assert.ok(hasCancelLog, 'Activity log for event registration cancellation must exist');
});

test('11. Concurrency: Multiple simultaneous registrations when only 1 seat remains strictly respects capacity', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');
  const amaraToken = await loginUser('amara.okafor@university.edu');
  const mateoToken = await loginUser('mateo.silva@university.edu');
  const hannahToken = await loginUser('hannah.chen@university.edu');

  // Create an event with capacity = 1
  const createRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Race Condition Capacity Test ${Date.now()}`,
      description: 'Single seat workshop to test race conditions under concurrent load',
      date: '2026-12-25',
      time: '18:00 - 19:00',
      location: 'Conference Room C',
      capacity: 1,
      creditReward: 20,
    }),
  });
  assert.equal(createRes.status, 201);
  const event = (await createRes.json()).data;

  // 4 different users fire registration requests simultaneously
  const responses = await Promise.all([
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${liamToken}` },
    }),
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${amaraToken}` },
    }),
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mateoToken}` },
    }),
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hannahToken}` },
    }),
  ]);

  const statuses = responses.map((r) => r.status);
  const successCount = statuses.filter((s) => s === 201).length;
  const rejectedCount = statuses.filter((s) => s === 400).length;

  // Under SELECT ... FOR UPDATE row-level locking:
  // Exactly 1 user wins the lock and succeeds; the other 3 see activeCount >= capacity and are rejected with 400
  assert.equal(successCount, 1, 'Exactly one concurrent registration must succeed when 1 seat remains');
  assert.equal(rejectedCount, 3, 'All other concurrent registrations must be rejected with 400 Full Capacity');

  // Verify in PostgreSQL database directly
  const activeRegistrations = await prisma.eventRegistration.count({
    where: {
      eventId: event.id,
      status: 'REGISTERED',
    },
  });
  assert.equal(activeRegistrations, 1, 'Database must never have more than 1 active registration for this event');
});

test('12. Concurrency: Simultaneous duplicate registration attempts for the same user are safely handled', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Create an event with capacity = 10
  const createRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Simultaneous Duplicate Test ${Date.now()}`,
      description: 'Testing duplicate race conditions',
      date: '2026-12-28',
      time: '14:00 - 15:00',
      location: 'Lab 101',
      capacity: 10,
      creditReward: 10,
    }),
  });
  assert.equal(createRes.status, 201);
  const event = (await createRes.json()).data;

  // Liam fires 4 registration requests concurrently
  const responses = await Promise.all([
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${liamToken}` },
    }),
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${liamToken}` },
    }),
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${liamToken}` },
    }),
    fetch(`${BASE_URL}/api/events/${event.id}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${liamToken}` },
    }),
  ]);

  const statuses = responses.map((r) => r.status);
  const successCount = statuses.filter((s) => s === 201).length;
  const conflictCount = statuses.filter((s) => s === 409).length;

  assert.equal(successCount, 1, 'Exactly 1 request must succeed');
  assert.equal(conflictCount, 3, 'All simultaneous duplicates must return 409 Conflict');

  const userRegs = await prisma.eventRegistration.count({
    where: {
      eventId: event.id,
      userId: 'usr-5', // Liam
      status: 'REGISTERED',
    },
  });
  assert.equal(userRegs, 1, 'Database must record exactly 1 registration row for Liam');
});

test('13. Registration reactivation after cancellation succeeds cleanly', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Create an event with capacity = 5
  const createRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Reactivation Test ${Date.now()}`,
      description: 'Testing cancelled to registered reactivation',
      date: '2026-12-29',
      time: '16:00 - 17:00',
      location: 'Atrium',
      capacity: 5,
      creditReward: 10,
    }),
  });
  const event = (await createRes.json()).data;

  // 1. Initial registration
  const reg1 = await fetch(`${BASE_URL}/api/events/${event.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(reg1.status, 201);
  const data1 = (await reg1.json()).data;
  assert.equal(data1.status, 'REGISTERED');

  // 2. Cancellation
  const cancel = await fetch(`${BASE_URL}/api/events/${event.id}/register`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(cancel.status, 200);
  const cancelData = (await cancel.json()).data;
  assert.equal(cancelData.status, 'CANCELLED');

  // 3. Reactivation (re-register)
  const reg2 = await fetch(`${BASE_URL}/api/events/${event.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(reg2.status, 201);
  const data2 = (await reg2.json()).data;
  assert.equal(data2.status, 'REGISTERED');

  // Verify in PostgreSQL database
  const record = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: { eventId: event.id, userId: 'usr-5' },
    },
  });
  assert.ok(record);
  assert.equal(record.status, 'REGISTERED');
});

test('14. Capacity cannot be reduced below current active registrations', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');
  const amaraToken = await loginUser('amara.okafor@university.edu');

  // Create an event with capacity = 4
  const createRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Capacity Reduction Test ${Date.now()}`,
      description: 'Testing capacity lower bound protection',
      date: '2026-12-30',
      time: '11:00 - 12:00',
      location: 'Seminar Room A',
      capacity: 4,
      creditReward: 10,
    }),
  });
  const event = (await createRes.json()).data;

  // Liam & Amara register (2 active registrations)
  await fetch(`${BASE_URL}/api/events/${event.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  await fetch(`${BASE_URL}/api/events/${event.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${amaraToken}` },
  });

  // Attempt to reduce capacity to 1 (less than 2 active registrations): MUST FAIL with 400
  const patchInvalidRes = await fetch(`${BASE_URL}/api/events/${event.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ capacity: 1 }),
  });
  assert.equal(patchInvalidRes.status, 400);
  const patchInvalidData = (await patchInvalidRes.json()) as { success: boolean; message: string };
  assert.equal(patchInvalidData.success, false);
  assert.match(patchInvalidData.message, /cannot reduce capacity/i);

  // Attempt to set capacity to 2 (equal to current active registrations): MUST SUCCEED with 200
  const patchValidRes = await fetch(`${BASE_URL}/api/events/${event.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ capacity: 2 }),
  });
  assert.equal(patchValidRes.status, 200);
  const updatedEvent = (await patchValidRes.json()).data;
  assert.equal(updatedEvent.capacity, 2);
});

test('15. Past events cannot accept new registrations', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Attempt to register for a completed event (evt-4)
  const regCompletedRes = await fetch(`${BASE_URL}/api/events/evt-4/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(regCompletedRes.status, 400);
  const dataCompleted = (await regCompletedRes.json()) as { success: boolean; message: string };
  assert.equal(dataCompleted.success, false);
  assert.match(dataCompleted.message, /past or completed event/i);

  // Create an event with a date in the past
  const pastEventRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Past Date Event ${Date.now()}`,
      description: 'Historical event',
      date: '2025-05-10',
      time: '10:00 - 11:00',
      location: 'Old Auditorium',
      capacity: 30,
      creditReward: 10,
    }),
  });
  const pastEvent = (await pastEventRes.json()).data;

  // Attempt to register for the past-dated event
  const regPastRes = await fetch(`${BASE_URL}/api/events/${pastEvent.id}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(regPastRes.status, 400);
  const dataPast = (await regPastRes.json()) as { success: boolean; message: string };
  assert.equal(dataPast.success, false);
  assert.match(dataPast.message, /past or completed event/i);
});

test('16. Public diagnostic endpoint privacy: Exposes no sensitive operational or database details', async () => {
  const res = await fetch(`${BASE_URL}/api/events/registrations/status`);
  assert.equal(res.status, 200);

  const rawText = await res.text();
  const json = JSON.parse(rawText);

  assert.equal(json.success, true);
  assert.equal(json.data.module, 'registrations');
  assert.equal(json.data.status, 'active');
  assert.ok(Array.isArray(json.data.endpoints));

  // Verify privacy: absolutely NO sensitive internal strings or credentials leaked
  assert.doesNotMatch(rawText, /password/i);
  assert.doesNotMatch(rawText, /hash/i);
  assert.doesNotMatch(rawText, /secret/i);
  assert.doesNotMatch(rawText, /token/i);
  assert.doesNotMatch(rawText, /database/i);
  assert.doesNotMatch(rawText, /postgresql/i);
  assert.doesNotMatch(rawText, /schema/i);
  assert.doesNotMatch(rawText, /@university\.edu/i);
});
