/**
 * Visual capture of the screens the 8 Sep meeting is about.
 *
 * Not assertions — this exists so the current state of each screen can be
 * looked at before it is redesigned. Screenshots land in ./shots.
 */
import { test } from '@playwright/test';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

// The session comes from auth.setup.ts.

const SCREENS: [string, string][] = [
  ['fleet-map', '/dashboard/fleet-map'],
  ['calculator', '/dashboard/calculator'],
  ['bookings', '/dashboard/bookings'],
  ['booking-detail', '/dashboard/bookings/MDPE2026090001'],
  ['admin-pricing', '/dashboard/admin-pricing'],
  ['dashboard-home', '/dashboard'],
];

test('capture every screen the meeting touched', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  for (const [name, path] of SCREENS) {
    await page.goto(BASE + path);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2500); // let maps and charts settle
    await page.screenshot({ path: `e2e/local-stack/shots/${name}.png`, fullPage: true });
    // eslint-disable-next-line no-console
    console.log(`captured ${name}`);
  }

  // eslint-disable-next-line no-console
  console.log('PAGE ERRORS:\n' + (errors.length ? errors.join('\n') : '(none)'));
});
