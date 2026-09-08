// Proves the guided "Tour" story mode: picking a scenario shows the overlay
// with a caption, Next advances through steps, and Exit tears it down.
import { test, expect, gotoReady, getState } from './fixtures';

test('playing a tour scenario advances captions and exits cleanly', async ({ page }) => {
  await gotoReady(page);

  const tourControl = page.getByTestId('tour');
  await expect(tourControl).toBeVisible();

  // toolbar.ts renders the Tour control as a <select> when scenarios are
  // supplied (the normal case) and as a hidden <button> placeholder
  // otherwise -- guard against the latter so this test fails loudly instead
  // of hanging if scenarios.json is ever empty.
  const tagName = await tourControl.evaluate((el) => el.tagName.toLowerCase());
  expect(tagName, 'expected the Tour control to be a <select> populated from scenarios.json').toBe('select');

  const options = await tourControl.locator('option').all();
  expect(options.length).toBeGreaterThan(1); // the disabled "Tour…" placeholder + at least one scenario

  await tourControl.selectOption({ index: 1 });

  const overlay = page.getByTestId('tour-overlay');
  await expect(overlay).toBeVisible();
  await expect.poll(async () => (await getState(page) as { tour: boolean }).tour).toBe(true);

  const caption = page.getByTestId('tour-caption');
  await expect(caption).not.toHaveText('');
  const firstCaption = await caption.textContent();

  await page.getByTestId('tour-next').click();
  await expect.poll(async () => caption.textContent()).not.toBe(firstCaption);
  const secondCaption = await caption.textContent();
  expect(secondCaption).not.toBe('');

  await page.getByTestId('tour-next').click();
  await expect.poll(async () => caption.textContent()).not.toBe(secondCaption);

  await expect.poll(async () => (await getState(page) as { tour: boolean }).tour).toBe(true);

  await page.getByTestId('tour-exit').click();

  await expect(overlay).toBeHidden();
  await expect.poll(async () => (await getState(page) as { tour: boolean }).tour).toBe(false);
});
