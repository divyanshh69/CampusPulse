import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5001';
const DEFAULT_PASSWORD = 'campusPulse123!';

async function loginUser(email: string, password = DEFAULT_PASSWORD): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { success: boolean; data?: { token: string } };
  if (!res.ok || !data.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.data.token;
}

test('Phase B.1: Attendance persists and recalculates member participation percentage', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  // Mark usr-5 as Absent for evt-1
  const markRes = await fetch(`${BASE_URL}/api/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      eventId: 'evt-1',
      memberId: 'usr-5',
      status: 'Absent',
    }),
  });
  assert.equal(markRes.status, 200);
  const markData = (await markRes.json()) as { success: boolean; data: { status: string; attendancePercentage: number } };
  assert.equal(markData.success, true);
  assert.equal(markData.data.status, 'Absent');

  // Persistence check: Re-fetch attendance records from backend
  const fetchRes = await fetch(`${BASE_URL}/api/attendance?eventId=evt-1&memberId=usr-5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(fetchRes.status, 200);
  const records = (await fetchRes.json()).data as Array<{ status: string; memberId: string }>;
  const found = records.find((r) => r.memberId === 'usr-5');
  assert.ok(found, 'Attendance record for usr-5 must exist in PostgreSQL');
  assert.equal(found.status, 'Absent');

  // Member record check: attendancePercentage in users table must reflect calculation
  const memberRes = await fetch(`${BASE_URL}/api/members/usr-5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(memberRes.status, 200);
  const memberData = (await memberRes.json()).data;
  assert.equal(memberData.attendancePercentage, markData.data.attendancePercentage);

  // Restore to Present
  await fetch(`${BASE_URL}/api/attendance/mark`, {
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
});

test('Phase B.2: Bulk Attendance (mark-all-present) updates roster in PostgreSQL', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  const bulkRes = await fetch(`${BASE_URL}/api/attendance/mark-all-present`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ eventId: 'evt-1' }),
  });

  assert.equal(bulkRes.status, 200);
  const bulkData = (await bulkRes.json()) as { success: boolean; data: { updatedCount: number } };
  assert.equal(bulkData.success, true);
  assert.ok(bulkData.data.updatedCount > 0);

  // Verify records in DB
  const rosterRes = await fetch(`${BASE_URL}/api/attendance/event/evt-1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(rosterRes.status, 200);
  const roster = (await rosterRes.json()).data as Array<{ status: string }>;
  assert.ok(roster.length > 0);
  assert.ok(roster.every((r) => r.status === 'Present'));
});

test('Phase B.3: Credit adjustments persist, update member balances, and prevent negative balance', async () => {
  const marcusToken = await loginUser('marcus.vance@university.edu');

  // Check Amara Okafor (usr-7, Technical member) initial balance
  const memberResBefore = await fetch(`${BASE_URL}/api/members/usr-7`, {
    headers: { Authorization: `Bearer ${marcusToken}` },
  });
  const balanceBefore = (await memberResBefore.json()).data.totalCredits;

  // Award +15 credits
  const awardRes = await fetch(`${BASE_URL}/api/credits/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({
      memberId: 'usr-7',
      delta: 15,
      reason: 'Phase B persistence test award',
      category: 'Task Completion',
    }),
  });
  assert.equal(awardRes.status, 200);
  const awardData = (await awardRes.json()).data;
  assert.equal(awardData.newBalance, balanceBefore + 15);

  // Persistence check: Verify transaction exists in ledger
  const txRes = await fetch(`${BASE_URL}/api/credits/transactions?memberId=usr-7`, {
    headers: { Authorization: `Bearer ${marcusToken}` },
  });
  assert.equal(txRes.status, 200);
  const txs = (await txRes.json()).data as Array<{ reason: string; delta: number }>;
  const foundTx = txs.find((t) => t.reason === 'Phase B persistence test award');
  assert.ok(foundTx, 'Transaction record must persist in PostgreSQL');
  assert.equal(foundTx.delta, 15);

  // Balance persistence check in user record
  const memberResAfter = await fetch(`${BASE_URL}/api/members/usr-7`, {
    headers: { Authorization: `Bearer ${marcusToken}` },
  });
  assert.equal((await memberResAfter.json()).data.totalCredits, balanceBefore + 15);

  // Negative balance prevention: Attempt to deduct excessive amount
  const negRes = await fetch(`${BASE_URL}/api/credits/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({
      memberId: 'usr-7',
      delta: -999,
      reason: 'Attempted catastrophic deduction',
      category: 'Penalty / Deduction',
    }),
  });
  assert.equal(negRes.status, 400);
  const negData = (await negRes.json()) as { success: boolean; message: string };
  assert.equal(negData.success, false);
  assert.match(negData.message, /cannot fall below 0/i);
});

test('Phase B.4: Tasks creation, persistence, and idempotent completion credit award', async () => {
  const marcusToken = await loginUser('marcus.vance@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Create new task assigned to Liam (usr-5)
  const taskTitle = `Integration Test Task ${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({
      title: taskTitle,
      description: 'Testing task lifecycle and credit award idempotency',
      assignedToId: 'usr-5',
      departmentId: 'dept-tech',
      deadline: '2026-12-15',
      priority: 'High',
      creditValue: 25,
    }),
  });
  assert.equal(createRes.status, 201);
  const createdTask = (await createRes.json()).data;
  assert.equal(createdTask.title, taskTitle);
  assert.equal(createdTask.status, 'To Do');

  // Check Liam's balance before completion
  const liamProfileBefore = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  const liamBalanceBefore = (await liamProfileBefore.json()).data.totalCredits;

  // Liam transitions task to Under Review
  const updateRes1 = await fetch(`${BASE_URL}/api/tasks/${createdTask.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${liamToken}`,
    },
    body: JSON.stringify({ status: 'Under Review' }),
  });
  assert.equal(updateRes1.status, 200);

  // Marcus marks task Completed (first time)
  const updateRes2 = await fetch(`${BASE_URL}/api/tasks/${createdTask.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({ status: 'Completed' }),
  });
  assert.equal(updateRes2.status, 200);

  // Verify Liam received exactly 25 credits
  const liamProfileAfter = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  const liamBalanceAfter = (await liamProfileAfter.json()).data.totalCredits;
  assert.equal(liamBalanceAfter, liamBalanceBefore + 25);

  // Idempotency: Trigger status update on already Completed task
  const repeatRes = await fetch(`${BASE_URL}/api/tasks/${createdTask.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({ status: 'Completed' }),
  });
  assert.equal(repeatRes.status, 200);

  // Verify Liam's credits were NOT awarded a second time
  const liamProfileRepeat = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal((await liamProfileRepeat.json()).data.totalCredits, liamBalanceAfter);
});

test('Phase B.5: Activity logs are persisted and retrieved from PostgreSQL', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  // Fetch recent activity logs
  const actRes = await fetch(`${BASE_URL}/api/activities?limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(actRes.status, 200);
  const logs = (await actRes.json()).data as Array<{ category: string; action: string; target: string }>;
  assert.ok(logs.length > 0, 'Database activity logs must not be empty');

  // Verify category names are valid frontend strings
  const validCategories = ['member', 'event', 'attendance', 'credit', 'task'];
  for (const log of logs.slice(0, 10)) {
    assert.ok(
      validCategories.includes(log.category),
      `Log category '${log.category}' must be one of ${validCategories.join(', ')}`
    );
  }
});

test('Phase B.6: Members, Events, Tasks, and Credit statistics reflect database state', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  const [membersRes, eventsRes, tasksRes, creditsRes] = await Promise.all([
    fetch(`${BASE_URL}/api/members`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    fetch(`${BASE_URL}/api/events`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    fetch(`${BASE_URL}/api/tasks`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    fetch(`${BASE_URL}/api/credits/transactions`, { headers: { Authorization: `Bearer ${adminToken}` } }),
  ]);

  assert.equal(membersRes.status, 200);
  assert.equal(eventsRes.status, 200);
  assert.equal(tasksRes.status, 200);
  assert.equal(creditsRes.status, 200);

  const members = (await membersRes.json()).data;
  const events = (await eventsRes.json()).data;
  const tasks = (await tasksRes.json()).data;
  const credits = (await creditsRes.json()).data;

  assert.ok(members.length >= 12, 'Expected database members count >= 12');
  assert.ok(events.length >= 5, 'Expected database events count >= 5');
  assert.ok(tasks.length >= 7, 'Expected database tasks count >= 7');
  assert.ok(credits.length >= 6, 'Expected database credit transactions >= 6');
});

