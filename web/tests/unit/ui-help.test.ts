// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HELP_EVENT,
  HELP_SEEN_KEY,
  hasSeenHelp,
  markHelpSeen,
  clearHelpSeen,
  mountHelp,
  shouldAutoOpenHelp,
  type HelpHandle,
} from '../../src/ui/help';
import { createStore } from '../../src/state/store';

const SCENARIOS = [
  { id: 'startup-sequence', title: 'How the car wakes up' },
  { id: 'accel-battery', title: 'Why does the battery care?' },
];

let handle: HelpHandle | null = null;

function mount(onStartTour?: (id?: string) => void): HelpHandle {
  handle = mountHelp({
    root: document.body,
    store: createStore(),
    scenarios: SCENARIOS,
    onStartTour,
  });
  return handle;
}

function q<T extends Element = HTMLElement>(testid: string): T {
  const el = document.querySelector<T>(`[data-testid="${testid}"]`);
  if (!el) throw new Error(`no element with data-testid="${testid}"`);
  return el;
}

function isOpen(): boolean {
  return !(q<HTMLElement>('help-backdrop') as HTMLElement).hidden;
}

beforeEach(() => {
  // happy-dom keeps localStorage between tests in the same file.
  localStorage.clear();
  document.body.innerHTML = '<div id="app"><button id="opener" data-testid="opener">open</button></div>';
});

afterEach(() => {
  handle?.destroy();
  handle = null;
  vi.useRealTimers();
});

// ---------------------------------------------------------------------- //
// The "seen" flag + auto-open policy                                      //
// ---------------------------------------------------------------------- //

describe('shouldAutoOpenHelp', () => {
  it('greets a first-time visitor with no hash', () => {
    expect(shouldAutoOpenHelp({ hash: '', search: '' })).toBe(true);
  });

  it('does not greet someone who has already seen it', () => {
    markHelpSeen();
    expect(hasSeenHelp()).toBe(true);
    expect(shouldAutoOpenHelp({ hash: '', search: '' })).toBe(false);
  });

  it('does not open on a deep link to a part or a requirement', () => {
    expect(shouldAutoOpenHelp({ hash: '#part=POWERTRAIN', search: '' })).toBe(false);
    expect(shouldAutoOpenHelp({ hash: '#req=REQ_PT_001', search: '' })).toBe(false);
    // ...including when the selection is not the first hash key.
    expect(shouldAutoOpenHelp({ hash: '#xray=1&part=BRAKES', search: '' })).toBe(false);
  });

  it('still opens for a hash that carries no selection', () => {
    expect(shouldAutoOpenHelp({ hash: '#xray=1&explode=0.4', search: '' })).toBe(true);
  });

  it('does not open under ?e2e', () => {
    expect(shouldAutoOpenHelp({ hash: '', search: '?e2e' })).toBe(false);
    expect(shouldAutoOpenHelp({ hash: '', search: '?foo=1&e2e' })).toBe(false);
  });

  it('clearHelpSeen undoes markHelpSeen', () => {
    markHelpSeen();
    clearHelpSeen();
    expect(hasSeenHelp()).toBe(false);
    expect(localStorage.getItem(HELP_SEEN_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------- //
// Dialog mechanics                                                        //
// ---------------------------------------------------------------------- //

describe('mountHelp', () => {
  it('mounts hidden, with an accessible modal dialog inside', () => {
    mount();
    expect(isOpen()).toBe(false);
    const dialog = q('help-dialog');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBe('help-title');
    expect(document.getElementById(labelledBy!)?.textContent).toBeTruthy();
  });

  it('opens and closes, moving focus in and returning it to the opener', () => {
    const h = mount();
    const opener = q<HTMLButtonElement>('opener');
    opener.focus();
    expect(document.activeElement).toBe(opener);

    h.open();
    expect(isOpen()).toBe(true);
    expect(h.isOpen()).toBe(true);
    expect(q('help-dialog').contains(document.activeElement)).toBe(true);

    h.close();
    expect(h.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes on "Got it"', () => {
    const h = mount();
    h.open();
    q<HTMLButtonElement>('help-got-it').click();
    expect(h.isOpen()).toBe(false);
  });

  it('closes on Escape', () => {
    const h = mount();
    h.open();
    q('help-dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.isOpen()).toBe(false);
  });

  it('closes on a backdrop click but not on a click inside the dialog', () => {
    const h = mount();
    h.open();
    const backdrop = q<HTMLElement>('help-backdrop');

    q('help-dialog').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    q('help-dialog').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.isOpen()).toBe(true);

    backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.isOpen()).toBe(false);
  });

  it('traps Tab inside the dialog', () => {
    const h = mount();
    h.open();
    const dialog = q('help-dialog');
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('button, input'));
    const first = items[0]!;
    const last = items[items.length - 1]!;

    last.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);

    first.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
  });

  it('opens on the "?" key, but not while typing in a field', () => {
    const h = mount();
    const input = document.createElement('input');
    document.body.append(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(h.isOpen()).toBe(false);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(h.isOpen()).toBe(true);
  });

  it('toggles on the toolbar button event', () => {
    const h = mount();
    document.dispatchEvent(new CustomEvent(HELP_EVENT));
    expect(h.isOpen()).toBe(true);
    document.dispatchEvent(new CustomEvent(HELP_EVENT));
    expect(h.isOpen()).toBe(false);
  });

  it('"Take the tour" closes the dialog and starts the first scenario', () => {
    const onStartTour = vi.fn();
    const h = mount(onStartTour);
    h.open();
    q<HTMLButtonElement>('help-start-tour').click();
    expect(h.isOpen()).toBe(false);
    expect(onStartTour).toHaveBeenCalledWith('startup-sequence');
  });

  it('hides <app> from assistive tech while open, and restores it on close', () => {
    const h = mount();
    h.open();
    expect(document.getElementById('app')?.getAttribute('aria-hidden')).toBe('true');
    h.close();
    expect(document.getElementById('app')?.hasAttribute('aria-hidden')).toBe(false);
  });
});

// ---------------------------------------------------------------------- //
// First visit                                                             //
// ---------------------------------------------------------------------- //

describe('maybeAutoOpen', () => {
  it('opens once, writes the seen flag, and never opens again', () => {
    const h = mount();
    expect(h.maybeAutoOpen()).toBe(true);
    expect(h.isOpen()).toBe(true);
    expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('1');

    h.close();
    expect(h.maybeAutoOpen()).toBe(false);
    expect(h.isOpen()).toBe(false);
  });

  it('shows "Don\'t show this again" (ticked) only on the auto-open', () => {
    const h = mount();
    h.maybeAutoOpen();
    const label = document.querySelector<HTMLElement>('.help-dont-show')!;
    expect(label.hidden).toBe(false);
    expect(q<HTMLInputElement>('help-dont-show').checked).toBe(true);

    h.close();
    h.open();
    expect(label.hidden).toBe(true);
  });

  it('unticking "Don\'t show this again" clears the flag so the next visit is greeted', () => {
    const h = mount();
    h.maybeAutoOpen();
    q<HTMLInputElement>('help-dont-show').checked = false;
    h.close();
    expect(localStorage.getItem(HELP_SEEN_KEY)).toBeNull();
    expect(shouldAutoOpenHelp({ hash: '', search: '' })).toBe(true);
  });

  it('does not auto-open when the URL carries a deep link', () => {
    const h = mount();
    location.hash = '#part=POWERTRAIN';
    try {
      expect(h.maybeAutoOpen()).toBe(false);
      expect(h.isOpen()).toBe(false);
      expect(localStorage.getItem(HELP_SEEN_KEY)).toBeNull();
    } finally {
      location.hash = '';
    }
  });
});

// ---------------------------------------------------------------------- //
// Content: the things a newcomer has to be told                           //
// ---------------------------------------------------------------------- //

describe('help content', () => {
  it('covers navigation, both tabs, the ladder, the controls and the keyboard', () => {
    mount();
    const text = q('help-dialog').textContent ?? '';
    for (const phrase of [
      'drag to rotate',
      'pinch',
      'pan',
      'parts tab',
      'requirements tab',
      'what customers need',
      'built into',
      'proven by test',
      'stk-003',
      'sys-002',
      'pt-001',
      'powertrain',
      'tc_accel',
      'explode',
      'x-ray',
      'sysml',
      'theme',
      'tour',
      'the math behind it',
      'state diagram',
      'tab',
      'enter',
      'esc',
    ]) {
      expect(text.toLowerCase(), `missing "${phrase}"`).toContain(phrase);
    }
    // The three ladder markers are spelled out, not assumed.
    expect(text).toContain('●');
    expect(text).toContain('■');
    expect(text).toContain('✓');
  });

  it('destroy() removes the dialog and its global listeners', () => {
    const h = mount();
    h.destroy();
    handle = null;
    expect(document.querySelector('[data-testid="help-dialog"]')).toBeNull();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(document.querySelector('[data-testid="help-dialog"]')).toBeNull();
  });
});
