import { describe, expect, it } from 'vitest';
import { createStore, defaultState } from '../../src/state/store';

describe('store', () => {
  it('get() returns the initial state', () => {
    const store = createStore();
    expect(store.get()).toEqual(defaultState());
  });

  it('set() merges a partial patch without mutating previous snapshots', () => {
    const store = createStore();
    const before = store.get();
    store.set({ xray: true, explode: 0.5 });
    const after = store.get();

    expect(before.xray).toBe(false);
    expect(after.xray).toBe(true);
    expect(after.explode).toBe(0.5);
    // Unrelated fields are preserved.
    expect(after.theme).toBe(before.theme);
  });

  it('subscribe() notifies listeners with the new state after set()', () => {
    const store = createStore();
    const seen: boolean[] = [];
    const unsubscribe = store.subscribe((state) => seen.push(state.xray));

    store.set({ xray: true });
    store.set({ xray: false });

    expect(seen).toEqual([true, false]);
    unsubscribe();
    store.set({ xray: true });
    expect(seen).toEqual([true, false]); // no more notifications after unsubscribe
  });

  it('subscribe() returns a working unsubscribe function', () => {
    const store = createStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.set({ tour: true });
    expect(calls).toBe(1);
    unsubscribe();
    store.set({ tour: false });
    expect(calls).toBe(1);
  });
});
