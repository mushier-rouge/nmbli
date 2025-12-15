import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SMOKE_SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.env.SMOKE_TEST_EMAIL || 'smoke-buyer@nmbli.com';
const TEST_PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'SmokeBuyer123!';

/**
 * Ensures the smoke-test user exists in Supabase Auth (password auth, email confirmed).
 */
async function ensureSmokeUser() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SMOKE_SUPABASE_SERVICE_ROLE_KEY for smoke tests');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const existing = list.users.find((u) => u.email === TEST_EMAIL);
  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Smoke Buyer' },
  });
  if (createError) {
    throw createError;
  }
  return created.user.id;
}

test.describe('Smoke: auth + brief CRUD', () => {
  test('login via password, create brief, delete brief', async ({ page, baseURL }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL is not set');
    }

    await ensureSmokeUser();

    // 1) Sign in via password-login API to set cookies in this browser context
    const loginResponse = await page.evaluate(async (email, password) => {
      const res = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // ignore
      }
      return { status: res.status, body };
    }, TEST_EMAIL, TEST_PASSWORD);

    expect(loginResponse.status).toBe(200);

    // 2) Create a brief through the API using the authenticated cookies
    const payload = {
      zipcode: '95126',
      paymentType: 'cash',
      maxOTD: 45000,
      makes: ['Toyota'],
      models: ['Camry'],
      trims: [],
      colors: [],
      mustHaves: [],
      timelinePreference: 'ASAP',
    };

    const createResult = await page.evaluate(async (body) => {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, body: json };
    }, payload);

    expect(createResult.status).toBe(200);
    expect(createResult.body?.brief?.id).toBeTruthy();
    const briefId = createResult.body.brief.id as string;

    // 3) Fetch briefs for the user to ensure listing works
    const listResult = await page.evaluate(async () => {
      const res = await fetch('/api/briefs', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, body: json };
    });
    expect(listResult.status).toBe(200);
    expect(Array.isArray(listResult.body)).toBe(true);
    expect(listResult.body.find((b: { id: string }) => b.id === briefId)).toBeTruthy();

    // 4) Delete the created brief to leave the environment clean
    const deleteResult = await page.evaluate(async (id) => {
      const res = await fetch(`/api/briefs/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, body: json };
    }, briefId);

    expect(deleteResult.status).toBe(200);
    expect(deleteResult.body?.success).toBe(true);
  });
});
