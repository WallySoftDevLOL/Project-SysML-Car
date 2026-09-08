import { expect, test } from '@playwright/test';

test('app loads, initializes, and shows no console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/');
  await page.waitForSelector('body[data-ready="true"]', { timeout: 30_000 });

  await expect(page.getByTestId('toolbar')).toBeVisible();
  await expect(page.getByTestId('viewport')).toBeVisible();
  await expect(page.getByTestId('panel')).toBeVisible();

  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});
