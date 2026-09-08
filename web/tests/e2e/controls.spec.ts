// Proves the toolbar controls actually drive shared state: X-ray, Explode,
// Theme, Terms, and the Escape-clears-selection shortcut.
import { test, expect, gotoReady, getSelection, getState } from './fixtures';

test('X-ray toggle flips aria-pressed and store.xray', async ({ page }) => {
  await gotoReady(page);

  const xrayBtn = page.getByTestId('xray');
  const before = (await getState(page) as { xray: boolean }).xray;
  await expect(xrayBtn).toHaveAttribute('aria-pressed', String(before));

  await xrayBtn.click();

  await expect(xrayBtn).toHaveAttribute('aria-pressed', String(!before));
  await expect.poll(async () => (await getState(page) as { xray: boolean }).xray).toBe(!before);
});

test('Explode slider set to 0.6 updates store.explode', async ({ page }) => {
  await gotoReady(page);

  const explode = page.getByTestId('explode');
  await explode.fill('0.6');
  // Some browsers only fire `change` (not `input`) from a programmatic fill
  // on a range input; nudge it so the store definitely sees the update.
  await explode.dispatchEvent('input');

  await expect.poll(async () => (await getState(page) as { explode: number }).explode).toBeCloseTo(0.6, 2);
});

test('Explode slider responds to keyboard input', async ({ page }) => {
  await gotoReady(page);

  const explode = page.getByTestId('explode');
  await explode.focus();
  await page.keyboard.press('Home'); // -> 0
  await expect.poll(async () => (await getState(page) as { explode: number }).explode).toBe(0);

  await page.keyboard.press('ArrowRight', { delay: 10 });
  await expect.poll(async () => (await getState(page) as { explode: number }).explode).toBeGreaterThan(0);
});

test('Theme toggle sets html[data-theme]', async ({ page }) => {
  await gotoReady(page);

  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.getByTestId('theme').click();
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

  expect(after).not.toBe(before);
  expect(['dark', 'light']).toContain(after);
  await expect.poll(async () => (await getState(page) as { theme: string }).theme).toBe(after);
});

test('Terms toggle changes plain <-> SysML wording on a block card', async ({ page }) => {
  await gotoReady(page);

  await page.locator('[data-testid="legend-chip"][data-id="POWERTRAIN"]').click();
  await expect(page.getByTestId('detail-title')).toContainText('Powertrain');

  const detailArea = page.locator('#detail-area, .detail-area').first();
  await expect(detailArea).toContainText('Responsible for');

  await page.getByTestId('terms').click();
  await expect.poll(async () => (await getState(page) as { terms: string }).terms).toBe('sysml');

  await expect(detailArea).toContainText('Satisfy');
  await expect(detailArea).not.toContainText('Responsible for');
});

test('Escape clears the selection', async ({ page }) => {
  await gotoReady(page);

  await page.locator('[data-testid="legend-chip"][data-id="POWERTRAIN"]').click();
  await expect.poll(() => getSelection(page)).not.toBeNull();

  // Focus something inside the panel so the Escape keydown bubbles through
  // panel.ts's listener (attached to #panel, not document).
  await page.getByTestId('search').focus();
  await page.keyboard.press('Escape');

  await expect.poll(() => getSelection(page)).toBeNull();
});
