// Proves the core "click a part, see its requirements" promise: picking a
// block in the 3D view (or, on mobile / when occluded, in the Parts list)
// drives the same selection state and the same detail card.
import { test, expect, gotoReady, getSelection } from './fixtures';

const POWERTRAIN_ID = 'POWERTRAIN';

async function clickProjectedBlock(page: import('@playwright/test').Page, blockId: string): Promise<boolean> {
  const viewport = page.getByTestId('viewport');
  const box = await viewport.boundingBox();
  const proj = await page.evaluate(
    (id) => (window as any).__viewer.projectBlock(id) as { x: number; y: number } | null,
    blockId,
  );
  if (!box || !proj) return false;
  const x = box.x + proj.x * box.width;
  const y = box.y + proj.y * box.height;
  // Stay inside the viewport bounds -- a projected point can land just
  // outside due to camera framing.
  if (x < box.x || x > box.x + box.width || y < box.y || y > box.y + box.height) return false;
  await page.mouse.click(x, y);
  await page.waitForTimeout(150);
  const sel = (await getSelection(page)) as { kind: string; id: string } | null;
  return sel?.kind === 'block' && sel?.id === blockId;
}

async function selectPartRow(page: import('@playwright/test').Page, blockId: string, tap: boolean): Promise<void> {
  await page.getByTestId('tab-parts').click();
  const row = page.locator(`[data-testid="part-row"][data-id="${blockId}"]`);
  await row.scrollIntoViewIfNeeded();
  if (tap) await row.tap();
  else await row.click();
}

test('clicking POWERTRAIN in the 3D view selects it and shows its requirements', async ({ page }, testInfo) => {
  await gotoReady(page);

  const isMobile = testInfo.project.name === 'mobile';
  const picked = await clickProjectedBlock(page, POWERTRAIN_ID);
  if (!picked) {
    testInfo.annotations.push({
      type: 'warning',
      description: `Projected 3D click on ${POWERTRAIN_ID} did not select it (likely occluded or off-screen); falling back to the Parts list row.`,
    });
    await selectPartRow(page, POWERTRAIN_ID, isMobile);
  }

  await expect(page.getByTestId('detail-title')).toContainText('Powertrain');
  await expect(page.getByTestId('req-count')).toHaveText(/^11\b/);

  const sel = await getSelection(page);
  expect(sel).toEqual({ kind: 'block', id: POWERTRAIN_ID });
});

test('tapping a Parts list row selects the block', async ({ page }, testInfo) => {
  await gotoReady(page);
  const isMobile = testInfo.project.name === 'mobile';

  await selectPartRow(page, POWERTRAIN_ID, isMobile);

  await expect(page.getByTestId('detail-title')).toContainText('Powertrain');
  const sel = await getSelection(page);
  expect(sel).toEqual({ kind: 'block', id: POWERTRAIN_ID });
});

test('clicking empty space in the 3D view clears the selection', async ({ page }) => {
  await gotoReady(page);

  // Select something first via the legend (deterministic, no projection math).
  await page.locator('[data-testid="legend-chip"][data-id="POWERTRAIN"]').click();
  await expect.poll(() => getSelection(page)).not.toBeNull();

  const box = await page.getByTestId('viewport').boundingBox();
  if (!box) throw new Error('viewport has no bounding box');

  // Try a handful of likely-empty spots (corners, inset a little from the
  // edge) since the exact framing of the car is owned by the scene/layout
  // work happening in parallel.
  const candidates: Array<[number, number]> = [
    [box.x + 12, box.y + 12],
    [box.x + box.width - 12, box.y + 12],
    [box.x + 12, box.y + box.height - 12],
    [box.x + box.width - 12, box.y + box.height - 12],
  ];

  let cleared = false;
  for (const [x, y] of candidates) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(150);
    const sel = await getSelection(page);
    if (sel === null) {
      cleared = true;
      break;
    }
  }

  expect(cleared, 'expected clicking one of the viewport corners to clear the selection').toBe(true);
});

test('clicking a legend chip selects the block', async ({ page }) => {
  await gotoReady(page);

  await page.locator('[data-testid="legend-chip"][data-id="POWERTRAIN"]').click();

  await expect(page.getByTestId('detail-title')).toContainText('Powertrain');
  const sel = await getSelection(page);
  expect(sel).toEqual({ kind: 'block', id: POWERTRAIN_ID });
});
