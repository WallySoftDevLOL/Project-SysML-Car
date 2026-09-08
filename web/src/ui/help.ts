// The "how do I read this page?" overlay. A self-contained accessible modal
// (role="dialog" + aria-modal, focus trap, Esc / backdrop close, focus
// returned to whatever opened it) explaining, in plain language, what the
// model is and how to drive the viewer.
//
// It owns three entry points:
//   - the toolbar's Help button (via the HELP_EVENT custom event, so
//     src/ui/toolbar.ts doesn't need a callback plumbed through mountUI),
//   - the "?" key, when focus isn't inside a text field,
//   - a once-per-browser auto-open on a first visit (see maybeAutoOpen()).
import { h, clear } from './dom';
import type { Store } from '../state/store';

/**
 * Fired on `document` by the toolbar's Help button. Using an event rather
 * than a callback keeps `mountToolbar` unaware of the help module (and means
 * `src/ui/index.ts` needs no new plumbing).
 */
export const HELP_EVENT = 'sysml-car:help';

/** localStorage key remembering that the first-visit auto-open already happened. */
export const HELP_SEEN_KEY = 'sysml-car:help-seen';

export interface HelpDeps {
  /** Where the dialog is appended. Normally `document.body`. */
  root: HTMLElement;
  /**
   * Accepted so the help module has the same shape as every other `src/ui/*`
   * mount, and so it can grow state-aware copy later. The content is static
   * today, so nothing reads it yet.
   */
  store: Store;
  /** Called by "Take the 90-second tour". Given the first scenario id when one exists. */
  onStartTour?(scenarioId?: string): void;
  /** Used only to pick the id handed to onStartTour. */
  scenarios?: Array<{ id: string; title: string }>;
}

export interface HelpHandle {
  open(opts?: { firstVisit?: boolean; opener?: HTMLElement | null }): void;
  close(): void;
  isOpen(): boolean;
  /** Opens (and records the visit) iff shouldAutoOpenHelp() says so. Returns whether it opened. */
  maybeAutoOpen(): boolean;
  destroy(): void;
}

/* ---------------------------------------------------------------------- */
/* "seen" flag                                                             */
/* ---------------------------------------------------------------------- */

/** Never throws: private mode / disabled storage just means the help shows again. */
export function hasSeenHelp(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(HELP_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Never throws. */
export function markHelpSeen(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(HELP_SEEN_KEY, '1');
  } catch {
    /* quota / private mode: the dialog will simply greet them again next visit */
  }
}

/** Never throws. Used by the "Don't show this again" checkbox when unticked. */
export function clearHelpSeen(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(HELP_SEEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface HelpLocation {
  hash: string;
  search: string;
}

/**
 * Should the dialog greet this visitor? No if they've seen it, no if the URL
 * is a deep link (`#part=` / `#req=`) — a shared link should land on its
 * content, not on a modal — and no under `?e2e`, so specs start clean.
 */
export function shouldAutoOpenHelp(loc?: HelpLocation): boolean {
  const where: HelpLocation =
    loc ?? (typeof location !== 'undefined' ? { hash: location.hash, search: location.search } : { hash: '', search: '' });
  if (hasSeenHelp()) return false;
  if (/[#&](part|req)=/.test(where.hash)) return false;
  try {
    if (new URLSearchParams(where.search).has('e2e')) return false;
  } catch {
    /* malformed query string: treat as "no e2e flag" */
  }
  return true;
}

/* ---------------------------------------------------------------------- */
/* Icons                                                                    */
/* ---------------------------------------------------------------------- */

// Hand-written 20x20 line icons (currentColor strokes, no icon library and no
// webfont) wrapped in a span so the tiny `h()` helper can stay HTML-only.
const ICONS: Record<string, string> = {
  car: '<path d="M3 12l1.6-4.2A2 2 0 0 1 6.5 6.5h7A2 2 0 0 1 15.4 7.8L17 12"/><path d="M2.5 12h15v3.5h-15z"/><circle cx="6" cy="15.5" r="1.5"/><circle cx="14" cy="15.5" r="1.5"/>',
  orbit: '<circle cx="10" cy="10" r="3"/><ellipse cx="10" cy="10" rx="8" ry="4"/><path d="M6 4.2 4.2 6 6 7.8"/>',
  doors: '<rect x="2.5" y="3.5" width="6.5" height="13" rx="1.5"/><rect x="11" y="3.5" width="6.5" height="13" rx="1.5"/><path d="M4.5 7h2.5M13 7h2.5"/>',
  ladder: '<path d="M6 3v14M14 3v14"/><path d="M6 6.5h8M6 10h8M6 13.5h8"/>',
  sliders: '<path d="M3 6h9M15 6h2M3 14h3M9 14h8"/><circle cx="13.5" cy="6" r="1.8"/><circle cx="7.5" cy="14" r="1.8"/>',
  keyboard: '<rect x="2" y="5" width="16" height="10" rx="2"/><path d="M5.5 8.5h.01M8.5 8.5h.01M11.5 8.5h.01M14.5 8.5h.01M6.5 12h7"/>',
};

function icon(name: keyof typeof ICONS | string): HTMLElement {
  const span = h('span', { class: 'help-icon', 'aria-hidden': 'true' });
  span.innerHTML =
    `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" ` +
    `stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ''}</svg>`;
  return span;
}

/* ---------------------------------------------------------------------- */
/* Content                                                                  */
/* ---------------------------------------------------------------------- */

function card(iconName: string, title: string, ...body: Array<Node | string>): HTMLElement {
  return h(
    'section',
    { class: 'help-card' },
    h('h3', { class: 'help-card-title' }, icon(iconName), h('span', null, title)),
    h('div', { class: 'help-card-body' }, ...body),
  );
}

function bullets(...items: Array<Node | string>): HTMLElement {
  return h('ul', { class: 'help-bullets' }, ...items.map((item) => h('li', null, item)));
}

/** Small bold lead-in for a bullet, e.g. "**Explode** — pull the car apart". */
function lead(text: string, rest: string): HTMLElement {
  return h('span', null, h('b', null, text), ` ${rest}`);
}

function marker(glyph: string): HTMLElement {
  return h('span', { class: 'help-marker', 'aria-hidden': 'true' }, glyph);
}

function buildContent(): HTMLElement[] {
  return [
    card(
      'car',
      'What this is',
      h(
        'p',
        null,
        'This is a real electric-car requirements model — the kind engineers build long before anything is manufactured — laid out as a 3D car you can click through. ',
        'Every part knows what it promised to do, and every promise knows which test proves it.',
      ),
    ),

    card(
      'orbit',
      'Get around the 3D car',
      bullets(
        lead('Drag', 'to rotate.'),
        lead('Scroll or pinch', 'to zoom.'),
        lead('Right-drag, or two-finger drag,', 'to pan.'),
        lead('Click a part', 'to select it.'),
        lead('Click empty space or press Esc', 'to clear the selection.'),
      ),
    ),

    card(
      'doors',
      'Two ways in',
      bullets(
        lead('Parts tab —', 'pick a system (Powertrain, Battery, Brakes…), then a component inside it.'),
        lead('Requirements tab —', 'search, or filter by category, then pick one.'),
      ),
      h(
        'p',
        null,
        'Either way the car answers: what you picked goes ',
        h('b', null, 'bright with an outline'),
        ', anything related gets a ',
        h('b', null, 'softer glow'),
        ', and everything else fades back.',
      ),
    ),

    card(
      'ladder',
      'Reading the trace ladder',
      h(
        'p',
        { class: 'help-markers' },
        marker('●'),
        ' a requirement · ',
        marker('■'),
        ' a part · ',
        marker('✓'),
        ' a test',
      ),
      h(
        'p',
        null,
        'The rungs run top-down: ',
        h('b', null, 'What customers need'),
        ' → ',
        h('b', null, 'What the car must do'),
        ' → ',
        h('b', null, 'What each part must do'),
        ', then ',
        h('b', null, 'Built into'),
        ' (the part that carries it) and ',
        h('b', null, 'Proven by test'),
        '.',
      ),
      h(
        'p',
        { class: 'help-example' },
        'For example: a customer wants responsive acceleration (',
        h('code', null, 'STK-003'),
        '), so the car must deliver propulsion (',
        h('code', null, 'SYS-002'),
        '), so one part must convert torque (',
        h('code', null, 'PT-001'),
        ') — that job is built into the ',
        h('b', null, 'Powertrain'),
        ' and proven by test ',
        h('code', null, 'TC_ACCEL'),
        '.',
      ),
    ),

    card(
      'sliders',
      'Controls',
      bullets(
        lead('Explode', '— slide to pull the car apart and see what is inside.'),
        lead('X-ray', '— see through the body to the parts underneath.'),
        lead('Plain / SysML', '— swaps everyday wording for the formal terms behind it: "Built into" is Satisfy, "Proven by test" is Verify, "Comes from" is DeriveRequirement.'),
        lead('Theme', '— dark or light.'),
        lead('Tour', '— pick a short guided story from the dropdown.'),
        lead('The math behind it', '— performance requirements carry a card with sliders; move an input and watch the number pass or fail its threshold.'),
        lead('State diagrams', '— parts with operating modes show how they switch between them.'),
      ),
    ),

    card(
      'keyboard',
      'Keyboard',
      bullets(
        lead('Tab', 'steps through the lists and controls.'),
        lead('Enter', 'selects the row you are on.'),
        lead('Esc', 'clears a selection, and closes this dialog.'),
        lead('← / →', 'step a tour backwards and forwards.'),
        lead('?', 'opens this help from anywhere.'),
      ),
    ),
  ];
}

/* ---------------------------------------------------------------------- */
/* Mount                                                                    */
/* ---------------------------------------------------------------------- */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  } catch {
    return false;
  }
}

/** True when a keystroke belongs to whatever the user is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return el.isContentEditable === true;
}

export function mountHelp(deps: HelpDeps): HelpHandle {
  const { root } = deps;
  const reducedMotion = prefersReducedMotion();

  let opener: HTMLElement | null = null;
  // Logical open state. Kept separate from `backdrop.hidden` because closing
  // holds the element around for the length of the fade-out.
  let openFlag = false;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const titleEl = h('h2', { class: 'help-title', id: 'help-title' }, 'How to use this page');
  const subtitle = h('p', { class: 'help-subtitle' }, 'A 30-second orientation. You can reopen it any time with the Help button or the ? key.');

  const closeX = h(
    'button',
    {
      type: 'button',
      class: 'btn help-x',
      'data-testid': 'help-x',
      'aria-label': 'Close help',
      on: { click: () => close() },
    },
    '✕',
  ) as HTMLButtonElement;

  const header = h('header', { class: 'help-header' }, h('div', null, titleEl, subtitle), closeX);

  const body = h('div', { class: 'help-body' }, ...buildContent());

  // "Don't show this again" only appears on the first-visit auto-open: on a
  // deliberate open there is nothing to suppress. Ticked by default, matching
  // the fact that maybeAutoOpen() has already written the flag; unticking it
  // clears the flag again so the next visit gets the same greeting.
  const dontShow = h('input', {
    type: 'checkbox',
    id: 'help-dont-show',
    'data-testid': 'help-dont-show',
    checked: true,
  }) as HTMLInputElement;
  const dontShowLabel = h(
    'label',
    { class: 'help-dont-show', for: 'help-dont-show', hidden: true },
    dontShow,
    h('span', null, "Don't show this again"),
  ) as HTMLLabelElement;

  const tourBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn help-tour',
      'data-testid': 'help-start-tour',
      on: {
        click: () => {
          const first = deps.scenarios?.[0]?.id;
          close();
          deps.onStartTour?.(first);
        },
      },
    },
    'Take the 90-second tour',
  ) as HTMLButtonElement;

  const gotItBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn help-got-it',
      'data-testid': 'help-got-it',
      on: { click: () => close() },
    },
    'Got it',
  ) as HTMLButtonElement;

  const footer = h('footer', { class: 'help-footer' }, dontShowLabel, h('div', { class: 'help-footer-actions' }, tourBtn, gotItBtn));

  const dialog = h(
    'div',
    {
      class: 'help-dialog',
      'data-testid': 'help-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'help-title',
      tabIndex: -1,
    },
    header,
    body,
    footer,
  ) as HTMLDivElement;

  const backdrop = h('div', { class: 'help-backdrop', 'data-testid': 'help-backdrop', hidden: true }, dialog) as HTMLDivElement;

  // A click that both starts and ends on the backdrop itself (never on the
  // card) is a click "outside" the dialog.
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) backdrop.dataset.pressOutside = '1';
  });
  backdrop.addEventListener('click', (e) => {
    const outside = e.target === backdrop && backdrop.dataset.pressOutside === '1';
    delete backdrop.dataset.pressOutside;
    if (outside) close();
  });

  function focusables(): HTMLElement[] {
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('hidden') && !el.closest('[hidden]'),
    );
  }

  function onDialogKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) {
      e.preventDefault();
      dialog.focus();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
  backdrop.addEventListener('keydown', onDialogKeydown);

  function isOpen(): boolean {
    return openFlag;
  }

  function open(opts: { firstVisit?: boolean; opener?: HTMLElement | null } = {}): void {
    if (openFlag) return;
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
    openFlag = true;
    opener = opts.opener !== undefined ? opts.opener : (document.activeElement as HTMLElement | null);
    dontShowLabel.hidden = !opts.firstVisit;
    if (opts.firstVisit) dontShow.checked = true;

    backdrop.hidden = false;
    document.getElementById('app')?.setAttribute('aria-hidden', 'true');
    // Force a reflow so the class change animates from the hidden state
    // rather than being coalesced into the same frame.
    void backdrop.offsetHeight;
    backdrop.classList.add('is-open');
    (focusables()[0] ?? dialog).focus();
  }

  function close(): void {
    if (!openFlag) return;
    openFlag = false;
    if (!dontShowLabel.hidden && !dontShow.checked) clearHelpSeen();
    else markHelpSeen();

    backdrop.classList.remove('is-open');
    document.getElementById('app')?.removeAttribute('aria-hidden');
    const finish = () => {
      backdrop.hidden = true;
      closeTimer = undefined;
    };
    if (reducedMotion) finish();
    else closeTimer = setTimeout(finish, 160);

    const target = opener;
    opener = null;
    if (target && typeof target.focus === 'function' && target.isConnected) target.focus();
  }

  function onHelpEvent() {
    if (isOpen()) close();
    else open();
  }
  document.addEventListener(HELP_EVENT, onHelpEvent);

  function onGlobalKeydown(e: KeyboardEvent) {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (isOpen()) return;
    e.preventDefault();
    open();
  }
  document.addEventListener('keydown', onGlobalKeydown);

  root.append(backdrop);

  return {
    open,
    close,
    isOpen,
    maybeAutoOpen() {
      if (!shouldAutoOpenHelp()) return false;
      // Written up front, not on close: someone who wanders off without
      // touching the dialog still shouldn't be greeted twice.
      markHelpSeen();
      open({ firstVisit: true, opener: null });
      return true;
    },
    destroy() {
      openFlag = false;
      if (closeTimer) clearTimeout(closeTimer);
      document.removeEventListener(HELP_EVENT, onHelpEvent);
      document.removeEventListener('keydown', onGlobalKeydown);
      document.getElementById('app')?.removeAttribute('aria-hidden');
      clear(backdrop);
      backdrop.remove();
    },
  };
}
