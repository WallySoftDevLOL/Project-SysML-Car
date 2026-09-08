// Color helpers derived from the loaded model, so the UI/scene never need a
// second fetch of data/blocks.json (docs/model-contract.md section 4) — the
// same colors are already on each Block element in model.json.
import type { BlockId, ModelJson } from './model/schema';

/** Block id -> hex color (e.g. "#F97316"), read from each Block element's `color` field. */
export function paletteFromModel(model: ModelJson): Map<BlockId, string> {
  const map = new Map<BlockId, string>();
  for (const el of model.elements) {
    if (el.kind === 'Block' && typeof el.color === 'string') {
      map.set(el.id, el.color);
    }
  }
  return map;
}

/**
 * WCAG relative-luminance based foreground pick: returns "#000" or "#fff",
 * whichever gives better contrast against `hex`.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function onColor(hex: string): '#000' | '#fff' {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  // Contrast against white vs. black; luminance threshold ~0.179 is the
  // standard crossover point for the WCAG contrast-ratio formula.
  return luminance > 0.179 ? '#000' : '#fff';
}
