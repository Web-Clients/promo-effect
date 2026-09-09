/**
 * An agent must not be able to see another agent's rates.
 *
 * Ion was explicit on 8 Sep and gave the reason: if they can see each other
 * "ei la un moment dat se sună și se reglează" — they phone one another and fix
 * the price. Competition between them is the whole point of the portal, so this
 * is a business requirement, not a privacy nicety.
 *
 * The seeded data makes the check meaningful: CN-01 quotes CMA CGM 40HQ at
 * $6400, CN-02 quotes the same lane at $6280, and CN-03 has an unapproved
 * Evergreen rate at $6180.
 */
import { test, expect } from '@playwright/test';

import { AGENT_STATE } from './auth-paths';

test.use({ storageState: AGENT_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';
const API = process.env.E2E_API_URL || 'http://localhost:3099/api';

// The agent session comes from auth.setup.ts.

test('an agent sees only his own rates on his page', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard');
  await page.goto(BASE + '/dashboard/my-prices');
  await page.waitForLoadState('networkidle').catch(() => {});

  await expect(page.getByText('$6400')).toBeVisible(); // his own
  await expect(page.getByText('$6280')).toHaveCount(0); // CN-02's
  await expect(page.getByText('$6180')).toHaveCount(0); // CN-03's
});

test('the agent-portal API refuses to hand one agent another agent rates', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard');

  const body = await page.evaluate(async (api) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(api + '/agent-portal/prices', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, text: (await res.text()).slice(0, 4000) };
  }, API);

  // A 404 or 401 would make the assertions below pass for the wrong reason.
  expect(body.status).toBe(200);
  expect(body.text).toContain('6400'); // his own rate really is in there

  // Whatever the transport, the payload must not carry a competitor's number.
  expect(body.text).not.toContain('6280');
  expect(body.text).not.toContain('6180');
});

test('an agent cannot reach the admin approval queue', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard');
  await page.goto(BASE + '/dashboard/price-approval');
  await page.waitForLoadState('networkidle').catch(() => {});
  // RequireRole sends a non-admin back to the dashboard.
  await expect(page).not.toHaveURL(/price-approval/);
});

test('the price calculator does not expose competitor rates to an agent', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard');

  const quote = await page.evaluate(async (api) => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(api + '/calculator/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        portOrigin: 'Ningbo',
        portDestination: 'Constanta',
        finalDestination: 'Chișinău',
        containers: [{ type: '40HQ', quantity: 1 }],
        cargoWeight: '23-24',
        cargoReadyDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
        incoterm: 'FOB',
      }),
    });
    return { status: res.status, text: (await res.text()).slice(0, 8000) };
  }, API);

  // eslint-disable-next-line no-console
  console.log('CALC status=' + quote.status + ' len=' + quote.text.length);
  // The endpoint must actually answer; a 404 here would prove nothing.
  expect([200, 403]).toContain(quote.status);
  expect(quote.text).not.toContain('6280');
  expect(quote.text).not.toContain('6180');
});
