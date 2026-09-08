// Tiny typed pub/sub store shared by main.ts, src/scene/*, and src/ui/*.
// Deliberately framework-free: get a snapshot, apply a partial patch, or
// subscribe to be notified after every set() (subscribers re-read via get()).
import type { BlockId, Selection } from '../model/schema';

export type Tab = 'parts' | 'reqs';
export type Terms = 'plain' | 'sysml';
export type Theme = 'dark' | 'light';

export interface AppState {
  selection: Selection;
  hover: BlockId | null;
  tab: Tab;
  query: string;
  categoryFilter: string | null;
  showCopies: boolean;
  terms: Terms;
  theme: Theme;
  xray: boolean;
  explode: number;
  tour: boolean;
}

export function defaultState(): AppState {
  return {
    selection: null,
    hover: null,
    tab: 'parts',
    query: '',
    categoryFilter: null,
    showCopies: false,
    terms: 'plain',
    theme: 'dark',
    xray: false,
    explode: 0,
    tour: false,
  };
}

export type Unsubscribe = () => void;
export type Listener = (state: AppState) => void;

export interface Store {
  get(): AppState;
  set(patch: Partial<AppState>): void;
  subscribe(fn: Listener): Unsubscribe;
}

export function createStore(initial: AppState = defaultState()): Store {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    get() {
      return state;
    },
    set(patch: Partial<AppState>) {
      state = { ...state, ...patch };
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn: Listener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** The single app-wide store instance. Import this rather than creating your own. */
export const store = createStore();
