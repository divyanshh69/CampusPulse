import test from 'node:test';
import assert from 'node:assert/strict';

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

  // Register Liam for Design Workshop (evt-4)
  await fetch(`${BASE_URL}/api/events/evt-4/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${liamToken}` },
  });

  // Fetch my-registrations
  const myRegsRes = await fetch(`${BASE_URL}/api/events/my-registrations`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(myRegsRes.status, 200);
  const myRegsData = (await myRegsRes.json()).data as Array<{ eventId: string; status: string; event: { title: string } }>;
  const found = myRegsData.find((r) => r.eventId === 'evt-4');
  assert.ok(found, 'Registration for evt-4 must persist in PostgreSQL');
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
