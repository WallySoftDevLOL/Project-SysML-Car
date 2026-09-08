// Toolbar: title, Tour dropdown (hidden when no scenarios are supplied),
// X-ray toggle, Explode slider, Terms toggle, Theme toggle — all two-way
// bound to the store.
import { h, clear } from './dom';
import type { AppState, Store } from '../state/store';

export interface ToolbarOptions {
  scenarios?: Array<{ id: string; title: string }>;
  onTourRequest?: (scenarioId: string) => void;
}

export interface ToolbarHandle {
  destroy(): void;
}

export function mountToolbar(toolbar: HTMLElement, store: Store, opts: ToolbarOptions = {}): ToolbarHandle {
  clear(toolbar);

  const brand = h('div', { class: 'toolbar-group toolbar-brand' }, h('span', { class: 'brand-title' }, 'SysML Car'));

  const explodeInput = h('input', {
    type: 'range',
    id: 'explode',
    'data-testid': 'explode',
    min: '0',
    max: '1',
    step: '0.01',
    value: String(store.get().explode),
    on: { input: () => store.set({ explode: Number((explodeInput as HTMLInputElement).value) }) },
  }) as HTMLInputElement;
  const explodeLabel = h('label', { class: 'control control-slider' }, h('span', { class: 'control-label' }, 'Explode'), explodeInput);

  const xrayBtn = h(
    'button',
    {
      type: 'button',
      id: 'xray',
      'data-testid': 'xray',
      class: 'btn btn-toggle',
      'aria-pressed': 'false',
      on: { click: () => store.set({ xray: !store.get().xray }) },
    },
    'X-ray',
  ) as HTMLButtonElement;

  const scenarios = opts.scenarios ?? [];
  let tourEl: HTMLElement;
  if (scenarios.length > 0) {
    const select = h(
      'select',
      {
        id: 'tour',
        'data-testid': 'tour',
        class: 'btn btn-toggle tour-select',
        on: {
          change: () => {
            const value = (select as HTMLSelectElement).value;
            if (!value) return;
            store.set({ tour: true });
            opts.onTourRequest?.(value);
          },
        },
      },
      h('option', { value: '', disabled: true, selected: true }, 'Tour…'),
      ...scenarios.map((s) => h('option', { value: s.id }, s.title)),
    ) as HTMLSelectElement;
    tourEl = select;
  } else {
    tourEl = h('button', { type: 'button', id: 'tour', 'data-testid': 'tour', class: 'btn btn-toggle', 'aria-pressed': 'false', hidden: true }, 'Tour');
  }

  const termsBtn = h(
    'button',
    {
      type: 'button',
      id: 'terms',
      'data-testid': 'terms',
      class: 'btn btn-toggle',
      'aria-pressed': String(store.get().terms === 'sysml'),
      on: { click: () => store.set({ terms: store.get().terms === 'plain' ? 'sysml' : 'plain' }) },
    },
    store.get().terms === 'plain' ? 'Plain' : 'SysML',
  ) as HTMLButtonElement;

  const themeBtn = h(
    'button',
    {
      type: 'button',
      id: 'theme',
      'data-testid': 'theme',
      class: 'btn btn-toggle',
      'aria-pressed': String(store.get().theme === 'light'),
      on: { click: () => store.set({ theme: store.get().theme === 'dark' ? 'light' : 'dark' }) },
    },
    'Theme',
  ) as HTMLButtonElement;

  const controls = h('div', { class: 'toolbar-group toolbar-controls' }, explodeLabel, xrayBtn, tourEl, termsBtn, themeBtn);
  toolbar.append(brand, controls);

  function sync(state: AppState) {
    xrayBtn.setAttribute('aria-pressed', String(state.xray));
    termsBtn.setAttribute('aria-pressed', String(state.terms === 'sysml'));
    termsBtn.textContent = state.terms === 'plain' ? 'Plain' : 'SysML';
    themeBtn.setAttribute('aria-pressed', String(state.theme === 'light'));
    if (scenarios.length > 0) tourEl.setAttribute('aria-pressed', String(state.tour));
    if (document.activeElement !== explodeInput) explodeInput.value = String(state.explode);
    document.documentElement.setAttribute('data-theme', state.theme);
  }
  sync(store.get());
  const unsubscribe = store.subscribe(sync);

  return {
    destroy() {
      unsubscribe();
      clear(toolbar);
    },
  };
}
