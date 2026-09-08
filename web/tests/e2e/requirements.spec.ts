// Proves the "find a requirement, trace it" promise: search brings the
// Requirements list forward, picking a result shows its detail + trace
// ladder, and the trace matches what data/model.json actually encodes.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, gotoReady, getSelection, getState } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const model = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/model.json'), 'utf-8')) as {
  elements: Array<{ id: string; name: string }>;
  relationships: Array<{ type: string; source: string; target: string }>;
};

/** Blocks that directly Satisfy `reqId`, per the raw model data. */
function directSatisfiers(reqId: string): Set<string> {
  return new Set(model.relationships.filter((r) => r.type === 'Satisfy' && r.target === reqId).map((r) => r.source));
}

test('searching "range" surfaces Nominal Driving Range and its trace ladder', async ({ page }) => {
  await gotoReady(page);

  await page.getByTestId('search').fill('range');

  // Typing a query brings the Requirements tab forward.
  await expect(page.getByTestId('tab-reqs')).toHaveClass(/is-active/);
  await expect.poll(async () => (await getState(page) as { tab: string }).tab).toBe('reqs');

  const reqItem = page.locator('[data-testid="req-item"]', { hasText: 'Nominal Driving Range' }).first();
  await expect(reqItem).toBeVisible();
  await reqItem.click();

  await expect(page.getByTestId('detail-title')).toContainText('Nominal Driving Range');

  const ladder = page.getByTestId('ladder');
  await expect(ladder).toBeVisible();
  // The satisfying block's plain-language name.
  await expect(ladder).toContainText('Whole vehicle');
  // The verification section, whose wording is stable across term modes/contexts.
  await expect(ladder).toContainText('Proven by test');

  const sel = await getSelection(page);
  expect(sel).toEqual({ kind: 'requirement', id: 'REQ_STK_002' });

  // Cross-check against the raw model: REQ_STK_002 is directly Satisfy'd by exactly one block, VEH
  // (the ladder may also show additional "inherited" part rungs reached via derived requirements,
  // so this checks the direct-satisfy edge itself rather than the rendered rung count).
  const satisfiers = directSatisfiers('REQ_STK_002');
  expect(satisfiers).toEqual(new Set(['VEH']));
});

test('a #req deep link selects that requirement directly', async ({ page }) => {
  await gotoReady(page, '/?e2e#req=REQ_STK_003');

  await expect(page.getByTestId('detail-title')).toContainText('Responsive Acceleration');

  const sel = await getSelection(page);
  expect(sel).toEqual({ kind: 'requirement', id: 'REQ_STK_003' });

  // Sanity-check the fixture assumption against the model itself.
  const req = model.elements.find((e) => e.id === 'REQ_STK_003');
  expect(req?.name).toBe('Responsive Acceleration');
});
