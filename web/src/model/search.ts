// Free-text search over requirements (and blocks/test cases by name) for the
// UI's search box. Pure string matching — no fuzzy scoring — so results are
// predictable and easy to reason about.
import type { Element } from './schema';
import type { ModelIndex } from './index';

export interface SearchOptions {
  /** Restrict to requirements in this category id (e.g. "PT"). Ignored for non-Requirement elements. */
  category?: string;
  /** Include non-authoritative VER-category copies. Default false. */
  includeCopies?: boolean;
}

/**
 * Every token in `query` (lowercased, whitespace-split) must appear as a
 * substring of at least one of an element's id / displayId / name / text.
 * Matches rank: a token prefix-matching `displayId` first, then a token
 * matching `name`, then everything else (id/text-only matches) — ties keep
 * their relative order from `model.elements` (a stable sort).
 */
export function search(idx: ModelIndex, query: string, options: SearchOptions = {}): Element[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const candidates = idx.model.elements.filter(
    (el) => el.kind === 'Requirement' || el.kind === 'Block' || el.kind === 'TestCase',
  );

  const matches: Array<{ el: Element; index: number; rank: number }> = [];
  candidates.forEach((el, index) => {
    if (el.kind === 'Requirement') {
      if (options.category && el.category !== options.category) return;
      if (!options.includeCopies && el.authoritative === false) return;
    }

    const displayId = typeof el.displayId === 'string' ? el.displayId.toLowerCase() : '';
    const name = el.name.toLowerCase();
    const text = typeof el.text === 'string' ? el.text.toLowerCase() : '';
    const id = el.id.toLowerCase();

    const allMatch = tokens.every((t) => id.includes(t) || displayId.includes(t) || name.includes(t) || text.includes(t));
    if (!allMatch) return;

    const displayIdPrefixMatch = tokens.some((t) => displayId.startsWith(t));
    const nameMatch = tokens.some((t) => name.includes(t));
    const rank = displayIdPrefixMatch ? 0 : nameMatch ? 1 : 2;

    matches.push({ el, index, rank });
  });

  matches.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.index - b.index));
  return matches.map((m) => m.el);
}
