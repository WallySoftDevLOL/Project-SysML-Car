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

/**
 * localStorage key for the persisted theme choice. The tiny inline script in
 * index.html reads the same key before first paint, so keep the two in step.
 */
export const THEME_STORAGE_KEY = 'sysml-car:theme';

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

/**
 * The theme the app should boot with: whatever index.html's pre-paint script
 * already put on <html data-theme>, falling back to a stored choice, then to
 * `prefers-color-scheme`, then to dark. Reading the attribute first means the
 * store can never disagree with the paint that already happened.
 *
 * Safe to call in a non-DOM environment (unit tests) - it just returns "dark".
 */
export function readInitialTheme(): Theme {
  try {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (isTheme(attr)) return attr;
    }
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (isTheme(stored)) return stored;
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }
  } catch {
    /* storage or matchMedia unavailable (private mode, SSR, old browser) */
  }
  return 'dark';
}

/** Remember an explicit theme choice. Never throws. */
export function persistTheme(theme: Theme): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* quota exceeded / storage disabled: the session still works, it just won't stick */
  }
}

/** The single app-wide store instance. Import this rather than creating your own. */
export const store = createStore({ ...defaultState(), theme: readInitialTheme() });
