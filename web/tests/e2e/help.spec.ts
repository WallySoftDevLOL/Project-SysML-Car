// Proves the "how do I read this page?" overlay: a first-time visitor is
// greeted once, the greeting stays dismissed, and the Help button, the "?"
// key and the footer's tour button all work.
//
// Note the two ways of navigating here. Most specs use gotoReady(), which
// adds `?e2e` -- and `?e2e` deliberately suppresses the first-visit auto-open
// (src/ui/help.ts shouldAutoOpenHelp) so every other spec starts on content
// rather than on a modal. The first test below therefore navigates by hand,
// without the flag, to exercise the real first-visit path.
import { test, expect, gotoReady } from './fixtures';
import type { Page } from '@playwright/test';

async function gotoFirstVisit(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('body[data-ready="true"]', { timeout: 30_000 });
}

test('a first-time visitor is greeted once, and never again after "Got it"', async ({ page }) => {
  await gotoFirstVisit(page);

  const dialog = page.getByTestId('help-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');

  // The orientation a newcomer actually needs is on screen, not behind a scroll.
  await expect(dialog).toContainText('Get around the 3D car');
  await expect(dialog).toContainText('Two ways in');
  await expect(dialog).toContainText('Proven by test');

  // "Don't show this again" only appears on the automatic greeting.
  await expect(page.getByTestId('help-dont-show')).toBeVisible();

  await page.getByTestId('help-got-it').click();
  await expect(dialog).toBeHidden();

  // Same browser, second visit: straight to the content.
  await page.reload();
  await page.waitForSelector('body[data-ready="true"]', { timeout: 30_000 });
  await expect(page.getByTestId('help-dialog')).toBeHidden();
  await expect(page.getByTestId('viewport')).toBeVisible();
});

test('the Help button opens the dialog, and Escape closes it', async ({ page }) => {
  await gotoReady(page);

  const dialog = page.getByTestId('help-dialog');
  await expect(dialog).toBeHidden(); // ?e2e opts out of the auto-open

  const helpBtn = page.getByTestId('help');
  await expect(helpBtn).toBeVisible();
  await expect(helpBtn).toHaveAttribute('aria-label', 'How to use this page');

  await helpBtn.click();
  await expect(dialog).toBeVisible();
  // No "Don't show this again" on a deliberate open: there is nothing to suppress.
  await expect(page.getByTestId('help-dont-show')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // Focus goes back to the button that opened it.
  await expect(helpBtn).toBeFocused();
});

test('the "?" key opens the dialog from anywhere, and the backdrop closes it', async ({ page }) => {
  await gotoReady(page);

  const dialog = page.getByTestId('help-dialog');
  await expect(dialog).toBeHidden();

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('?');
  await expect(dialog).toBeVisible();

  // Click the backdrop well clear of the 720px-wide card.
  await page.getByTestId('help-backdrop').click({ position: { x: 6, y: 6 } });
  await expect(dialog).toBeHidden();
});

test('"?" is ignored while typing in the search box', async ({ page }) => {
  await gotoReady(page);

  const search = page.getByTestId('search');
  await search.click();
  await search.pressSequentially('?');

  await expect(page.getByTestId('help-dialog')).toBeHidden();
  await expect(search).toHaveValue('?');
});

test('"Take the 90-second tour" closes the help and starts a tour', async ({ page }) => {
  await gotoReady(page);

  await page.getByTestId('help').click();
  const dialog = page.getByTestId('help-dialog');
  await expect(dialog).toBeVisible();

  await page.getByTestId('help-start-tour').click();

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('tour-overlay')).toBeVisible();
  await expect(page.getByTestId('tour-caption')).not.toHaveText('');
});

test('a deep link skips the greeting entirely', async ({ page }) => {
  // Fresh context, so the "seen" flag is unset: only the hash suppresses it.
  await page.goto('/#part=POWERTRAIN');
  await page.waitForSelector('body[data-ready="true"]', { timeout: 30_000 });

  await expect(page.getByTestId('help-dialog')).toBeHidden();
  await expect(page.getByTestId('detail-title')).toContainText('Powertrain');
});
