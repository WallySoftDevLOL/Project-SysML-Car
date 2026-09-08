// Shared Playwright fixtures for every e2e spec:
//  - `test`/`expect` wrap the base ones so every test automatically fails on
//    any console.error or uncaught page error (listeners are attached before
//    the test body runs, i.e. before any navigation happens), with no
//    allow-list.
//  - every test gets a screenshot attached to its report on completion
//    (pass or fail), not just on failure.
//  - `gotoReady(page, path)` is a small helper: navigate with the `e2e` query
//    param (so `window.__store`/`window.__viewer` are exposed, see
//    src/main.ts) and wait for `body[data-ready="true"]`.
import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await use(page);

    try {
      const buf = await page.screenshot({ fullPage: false });
      await testInfo.attach('final-screenshot', { body: buf, contentType: 'image/png' });
    } catch {
      // page may already be closed; a missing screenshot shouldn't mask a real failure.
    }

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  },
});

export { expect };

/** Navigate to `path` with the e2e hook query param and wait for the app to finish booting. */
export async function gotoReady(page: Page, path = '/?e2e'): Promise<void> {
  await page.goto(path);
  await page.waitForSelector('body[data-ready="true"]', { timeout: 30_000 });
}

/** Read the current AppState selection out of the exposed store. */
export function getSelection(page: Page) {
  return page.evaluate(() => (window as unknown as { __store: { get(): { selection: unknown } } }).__store.get().selection);
}

/** Read the full AppState snapshot out of the exposed store. */
export function getState(page: Page) {
  return page.evaluate(() => (window as unknown as { __store: { get(): unknown } }).__store.get());
}
