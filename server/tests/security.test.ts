import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const BASE_URL = 'http://localhost:5001';
const DEFAULT_PASSWORD = 'campusPulse123!';

// Helper function to log in and get JWT token
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

test('1. Null or empty password login is rejected safely', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'elena.rostova@university.edu', password: '' }),
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
});

test('2. Incorrect password is rejected with 401 Unauthorized', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'elena.rostova@university.edu', password: 'wrongPassword!999' }),
  });
  assert.equal(res.status, 401);
  const data = (await res.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
  assert.match(data.message, /invalid email or password/i);
});

test('3. Task Status IDOR: Member cannot complete or modify another member\'s task', async () => {
  // Liam O'Connor (usr-5) is a Member
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // tsk-1 is assigned to Devon Brooks (usr-6) in Outreach
  const res = await fetch(`${BASE_URL}/api/tasks/tsk-1/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${liamToken}`,
    },
    body: JSON.stringify({ status: 'Completed' }),
  });

  assert.equal(res.status, 403);
  const data = (await res.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
  assert.match(data.message, /only update tasks assigned to their own user ID/i);
});

test('4. Task Status IDOR: Member cannot earn credits by modifying another member\'s task', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Verify Liam's credits before
  const profileResBefore = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  const profileBefore = (await profileResBefore.json()) as { data: { totalCredits: number } };

  // Attempt unauthorized task completion
  const res = await fetch(`${BASE_URL}/api/tasks/tsk-1/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${liamToken}`,
    },
    body: JSON.stringify({ status: 'Completed' }),
  });
  assert.equal(res.status, 403);

  // Verify Liam's credits remained unchanged
  const profileResAfter = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  const profileAfter = (await profileResAfter.json()) as { data: { totalCredits: number } };
  assert.equal(profileAfter.data.totalCredits, profileBefore.data.totalCredits);
});

test('5. Cross-Department Attendance: Department Head cannot manage another department\'s attendance', async () => {
  // Sora Takahashi (usr-3) is Head of Design & Creative (dept-design)
  const soraToken = await loginUser('sora.takahashi@university.edu');

  // evt-1 belongs to Technical & Engineering (dept-tech)
  const resMark = await fetch(`${BASE_URL}/api/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${soraToken}`,
    },
    body: JSON.stringify({
      eventId: 'evt-1',
      memberId: 'usr-5',
      status: 'Present',
    }),
  });

  assert.equal(resMark.status, 403);
  const markData = (await resMark.json()) as { success: boolean; message: string };
  assert.equal(markData.success, false);
  assert.match(markData.message, /assigned department/i);

  // Also test mark-all-present batch endpoint
  const resMarkAll = await fetch(`${BASE_URL}/api/attendance/mark-all-present`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${soraToken}`,
    },
    body: JSON.stringify({
      eventId: 'evt-1',
    }),
  });
  assert.equal(resMarkAll.status, 403);
});

test('6. Cross-Department Credits: Department Head cannot adjust another department member\'s credits', async () => {
  // Sora Takahashi (usr-3) is Head of Design & Creative (dept-design)
  const soraToken = await loginUser('sora.takahashi@university.edu');

  // Liam O'Connor (usr-5) is in Technical & Engineering (dept-tech)
  const res = await fetch(`${BASE_URL}/api/credits/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${soraToken}`,
    },
    body: JSON.stringify({
      memberId: 'usr-5',
      delta: 15,
      reason: 'Cross-dept unauthorized award',
      category: 'Leadership Bonus',
    }),
  });

  assert.equal(res.status, 403);
  const data = (await res.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
  assert.match(data.message, /within their own department/i);
});

test('7. Self-Credit Adjustment: Department Head cannot adjust their own credits', async () => {
  // Marcus Vance (usr-2) is Head of Technical & Engineering (dept-tech)
  const marcusToken = await loginUser('marcus.vance@university.edu');

  const res = await fetch(`${BASE_URL}/api/credits/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({
      memberId: 'usr-2', // Self
      delta: 50,
      reason: 'Self awarded bonus',
      category: 'Leadership Bonus',
    }),
  });

  assert.equal(res.status, 403);
  const data = (await res.json()) as { success: boolean; message: string };
  assert.equal(data.success, false);
  assert.match(data.message, /cannot award or deduct credits from their own account/i);
});

test('8. Role Authorization: Regular member cannot access administrative operations', async () => {
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // Member cannot adjust credits
  const creditRes = await fetch(`${BASE_URL}/api/credits/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${liamToken}`,
    },
    body: JSON.stringify({
      memberId: 'usr-7',
      delta: 10,
      reason: 'Peer credit grant',
      category: 'Task Completion',
    }),
  });
  assert.equal(creditRes.status, 403);

  // Member cannot mark attendance
  const attRes = await fetch(`${BASE_URL}/api/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${liamToken}`,
    },
    body: JSON.stringify({
      eventId: 'evt-1',
      memberId: 'usr-5',
      status: 'Present',
    }),
  });
  assert.equal(attRes.status, 403);

  // Member cannot create an event
  const evtRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${liamToken}`,
    },
    body: JSON.stringify({
      title: 'Rogue Event',
      date: '2026-12-01',
      time: '18:00',
      location: 'Room 101',
      capacity: 50,
    }),
  });
  assert.equal(evtRes.status, 403);
});

test('9. Sensitive Read Endpoints reject unauthenticated requests with 401', async () => {
  const endpoints = [
    '/api/members',
    '/api/members/usr-1',
    '/api/tasks',
    '/api/credits/transactions',
    '/api/attendance/event/evt-1',
  ];

  for (const endpoint of endpoints) {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    assert.equal(
      res.status,
      401,
      `Expected 401 Unauthorized for unauthenticated GET ${endpoint}, got ${res.status}`
    );
    const data = (await res.json()) as { success: boolean; message: string };
    assert.equal(data.success, false);
    assert.match(data.message, /authentication required|no token/i);
  }
});

test('10. Privacy Scoping: Member profile strips private activity history for regular peers', async () => {
  // Liam O'Connor (Member) inspects Elena Rostova (Admin)
  const liamToken = await loginUser('liam.oconnor@university.edu');
  const res = await fetch(`${BASE_URL}/api/members/usr-1`, {
    headers: { Authorization: `Bearer ${liamToken}` },
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    data: {
      id: string;
      email: string;
      attendanceRecords?: unknown[];
      creditTransactions?: unknown[];
      assignedTasks?: unknown[];
    };
  };

  assert.equal(data.data.id, 'usr-1');
  assert.equal(data.data.attendanceRecords, undefined);
  assert.equal(data.data.creditTransactions, undefined);
  assert.equal(data.data.assignedTasks, undefined);
});

test('11. Error Disclosure Sanitization: DB validation errors return clean sanitized responses without leaking stack traces or schema internals', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');

  // Trigger error with invalid payload format
  const res = await fetch(`${BASE_URL}/api/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      email: 'not-an-email',
      role: 'SUPER_ADMIN_INVALID',
    }),
  });

  assert.ok(res.status === 400 || res.status === 422);
  const bodyText = await res.text();
  assert.ok(!bodyText.includes('node_modules'), 'Response should not expose node_modules file paths');
  assert.ok(!bodyText.includes('at '), 'Response should not expose stack trace traces');
  assert.ok(!bodyText.includes('prisma/schema.prisma'), 'Response should not expose prisma schema paths');
});

test('12. Production Startup Security: Startup strictly rejected if JWT_SECRET is unsafe or default in production', () => {
  const envPath = path.resolve(process.cwd(), 'server/config/env.ts');

  // Test 1: Fallback secret in production should throw FATAL error
  const resultFallback = spawnSync(
    'npx',
    ['tsx', '-e', `process.env.NODE_ENV = 'production'; process.env.JWT_SECRET = 'campuspulse-dev-secret-key-change-this-in-production-min32chars'; import('${envPath}');`],
    { encoding: 'utf8' }
  );
  assert.notEqual(resultFallback.status, 0);
  assert.match(
    resultFallback.stderr + resultFallback.stdout,
    /FATAL CONFIGURATION ERROR/
  );

  // Test 2: Short secret in production (< 32 chars) should throw FATAL error
  const resultShort = spawnSync(
    'npx',
    ['tsx', '-e', `process.env.NODE_ENV = 'production'; process.env.JWT_SECRET = 'too-short'; import('${envPath}');`],
    { encoding: 'utf8' }
  );
  assert.notEqual(resultShort.status, 0);
  assert.match(
    resultShort.stderr + resultShort.stdout,
    /FATAL CONFIGURATION ERROR/
  );
});

test('13. Legitimate Operations: Admin and Dept Head legitimate operations succeed', async () => {
  const adminToken = await loginUser('elena.rostova@university.edu');
  const marcusToken = await loginUser('marcus.vance@university.edu');
  const liamToken = await loginUser('liam.oconnor@university.edu');

  // 13.1 Admin can read members
  const membersRes = await fetch(`${BASE_URL}/api/members`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(membersRes.status, 200);

  // 13.2 Dept Head Marcus can adjust credits for a member in his own department (Liam, dept-tech)
  const adjustRes = await fetch(`${BASE_URL}/api/credits/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${marcusToken}`,
    },
    body: JSON.stringify({
      memberId: 'usr-5',
      delta: 5,
      reason: 'Legitimate intra-department engineering contribution',
      category: 'Task Completion',
    }),
  });
  assert.equal(adjustRes.status, 200);

  // 13.3 Member Liam can update status of his own assigned task (tsk-2)
  const taskRes = await fetch(`${BASE_URL}/api/tasks/tsk-2/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${liamToken}`,
    },
    body: JSON.stringify({ status: 'Under Review' }),
  });
  assert.equal(taskRes.status, 200);
});

test('14. Rate Limiter Security: Middleware binds to req.ip and rejects spoofed X-Forwarded-For bypasses', () => {
  const limiter = rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3,
    message: 'Rate limit exceeded.',
  });

  const responses: { status?: number; jsonBody?: unknown; headers: Record<string, unknown> }[] = [];

  const mockRes = (resIndex: number) => ({
    headers: {} as Record<string, unknown>,
    setHeader(key: string, val: unknown) {
      this.headers[key] = val;
    },
    status(code: number) {
      responses[resIndex] = { ...responses[resIndex], status: code, headers: this.headers };
      return this;
    },
    json(body: unknown) {
      if (responses[resIndex]) {
        responses[resIndex].jsonBody = body;
      } else {
        responses[resIndex] = { status: 200, jsonBody: body, headers: this.headers };
      }
      return this;
    },
  });

  let nextCalledCount = 0;
  const mockNext = () => {
    nextCalledCount++;
  };

  // Attacker connects from socket IP 10.10.10.10, but attempts to spoof X-Forwarded-For with varying IPs
  for (let i = 0; i < 5; i++) {
    const mockReq = {
      ip: '10.10.10.10', // Validated Express IP (determined by trust-proxy configuration)
      headers: {
        'x-forwarded-for': `198.51.100.${i}`, // Spoofed headers
      },
      socket: {
        remoteAddress: '10.10.10.10',
      },
    } as unknown as import('express').Request;

    const res = mockRes(i) as unknown as import('express').Response;
    limiter(mockReq, res, mockNext);
  }

  // Exactly 3 calls should succeed (passing to next), and subsequent 2 calls must be blocked with HTTP 429
  assert.equal(nextCalledCount, 3, 'First 3 requests should be allowed');
  assert.equal(responses[3]?.status, 429, '4th request must be rejected with 429');
  assert.equal(responses[4]?.status, 429, '5th request must be rejected with 429');
  assert.ok(responses[3]?.headers['Retry-After'], '429 response must provide Retry-After header');
});
