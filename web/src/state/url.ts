// Syncs the small slice of state worth deep-linking (selection, xray,
// explode) to location.hash, e.g. "#part=POWERTRAIN&xray=1&explode=0.4".
// Two-way: reading the hash seeds the store on load / back-forward nav;
// writing the store updates the hash without adding history entries.
import type { Selection } from '../model/schema';
import type { Store } from './store';

function parseHash(hash: string): { selection: Selection; xray?: boolean; explode?: number } {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  let selection: Selection = null;
  const part = params.get('part');
  const req = params.get('req');
  if (part) selection = { kind: 'block', id: part };
  else if (req) selection = { kind: 'requirement', id: req };

  const result: { selection: Selection; xray?: boolean; explode?: number } = { selection };
  if (params.has('xray')) result.xray = params.get('xray') === '1';
  if (params.has('explode')) {
    const n = Number(params.get('explode'));
    if (Number.isFinite(n)) result.explode = Math.min(1, Math.max(0, n));
  }
  return result;
}

function serializeHash(state: { selection: Selection; xray: boolean; explode: number }): string {
  const params = new URLSearchParams();
  if (state.selection?.kind === 'block') params.set('part', state.selection.id);
  else if (state.selection?.kind === 'requirement') params.set('req', state.selection.id);
  if (state.xray) params.set('xray', '1');
  if (state.explode > 0) params.set('explode', state.explode.toFixed(2));
  const s = params.toString();
  return s ? `#${s}` : '';
}

/**
 * Wire a store up to location.hash. Call once during app init, after the
 * store has its initial values (this immediately applies whatever is in the
 * current hash on top of them).
 */
export function initUrlSync(store: Store): () => void {
  function applyFromHash() {
    const parsed = parseHash(location.hash);
    store.set({
      selection: parsed.selection,
      ...(parsed.xray !== undefined ? { xray: parsed.xray } : {}),
      ...(parsed.explode !== undefined ? { explode: parsed.explode } : {}),
    });
  }

  applyFromHash();
  window.addEventListener('hashchange', applyFromHash);

  let writing = false;
  const unsubscribe = store.subscribe((state) => {
    if (writing) return;
    const next = serializeHash(state);
    const current = location.hash;
    if (next !== current && !(next === '' && current === '')) {
      writing = true;
      history.replaceState(null, '', next === '' ? location.pathname + location.search : next);
      writing = false;
    }
  });

  return () => {
    window.removeEventListener('hashchange', applyFromHash);
    unsubscribe();
  };
}
