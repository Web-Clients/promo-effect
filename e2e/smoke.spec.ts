import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Promo-Efect/i);
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('public pages load', async ({ page }) => {
    await page.goto('/servicii');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/preturi');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/contact');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('language switcher works', async ({ page }) => {
    await page.goto('/');
    // Look for language switcher buttons
    const enButton = page.locator('button:has-text("EN")');
    if (await enButton.isVisible()) {
      await enButton.click();
      // Verify localStorage was set
      const lang = await page.evaluate(() => localStorage.getItem('language'));
      expect(lang).toBe('en');
    }
  });

  test('calculator page loads', async ({ page }) => {
    await page.goto('/calcul-prompt');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
