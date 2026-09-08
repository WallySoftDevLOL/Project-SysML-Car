import { test, expect, gotoReady } from './fixtures';

test('app loads, initializes, and shows no console errors', async ({ page }) => {
  await gotoReady(page);

  await expect(page.getByTestId('toolbar')).toBeVisible();
  await expect(page.getByTestId('viewport')).toBeVisible();
  await expect(page.getByTestId('panel')).toBeVisible();
});
