// The bottom-left overlay card shown while a tour plays: caption, progress
// dots, and Back / Next / Exit controls. Pure DOM + a subscription to
// TourPlayer.onChange() — owns no tour state itself.
import { h, clear } from '../ui/dom';
import type { TourPlayer, TourPlayerState } from './player';

export interface TourOverlayHandle {
  destroy(): void;
}

/** Mounts the tour overlay into `container` (the viewport element). Hidden until a tour is playing. */
export function createTourOverlay(container: HTMLElement, player: TourPlayer): TourOverlayHandle {
  const titleEl = h('div', { class: 'tour-title', 'data-testid': 'tour-title' }, '');
  const exitBtn = h(
    'button',
    { type: 'button', class: 'btn tour-exit', 'data-testid': 'tour-exit', 'aria-label': 'Exit tour', on: { click: () => player.exit() } },
    '✕',
  ) as HTMLButtonElement;
  const header = h('div', { class: 'tour-header' }, titleEl, exitBtn);

  const caption = h('p', { class: 'tour-caption', 'data-testid': 'tour-caption' }, '');

  // A sequence-diagram message strip: "sender ── message() ──▶ receiver",
  // monospace, with the UML message sort (SynchCall, AsyncSignal, ...) as a
  // native tooltip. Hidden unless the current step resolved a message
  // (src/tour/player.ts TourPlayerState.message).
  const msgStrip = h('div', { class: 'tour-msg', 'data-testid': 'tour-msg', hidden: true }, '');

  // A compact horizontal state-machine strip (Off · Starting · Ready · ...)
  // with the current state highlighted. Hidden unless the current step
  // resolved a state machine (TourPlayerState.stateStrip).
  const stateStrip = h('div', { class: 'tour-state-strip', 'data-testid': 'tour-state-strip', hidden: true });

  const dots = h('div', { class: 'tour-dots', 'data-testid': 'tour-dots' });
  const backBtn = h(
    'button',
    { type: 'button', class: 'btn tour-back', 'data-testid': 'tour-back', on: { click: () => player.back() } },
    '← Back',
  ) as HTMLButtonElement;
  const nextBtn = h(
    'button',
    { type: 'button', class: 'btn tour-next', 'data-testid': 'tour-next', on: { click: () => player.next() } },
    'Next →',
  ) as HTMLButtonElement;
  const footer = h('div', { class: 'tour-footer' }, backBtn, dots, nextBtn);

  const card = h(
    'div',
    { class: 'tour-overlay', 'data-testid': 'tour-overlay', role: 'dialog', 'aria-label': 'Story mode', hidden: true },
    header,
    caption,
    msgStrip,
    stateStrip,
    footer,
  ) as HTMLDivElement;

  card.addEventListener('mouseenter', () => player.pause());
  card.addEventListener('mouseleave', () => player.resume());

  function onKeydown(e: KeyboardEvent) {
    if (!player.current()) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      player.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      player.back();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      player.exit();
    }
  }
  document.addEventListener('keydown', onKeydown);

  function renderDots(stepIndex: number, stepCount: number) {
    clear(dots);
    for (let i = 0; i < stepCount; i++) {
      dots.append(
        h('span', {
          class: `tour-dot${i === stepIndex ? ' is-active' : ''}`,
          'data-testid': 'tour-dot',
        }),
      );
    }
  }

  function renderMessage(message: TourPlayerState['message']) {
    if (!message) {
      msgStrip.hidden = true;
      msgStrip.removeAttribute('title');
      return;
    }
    msgStrip.hidden = false;
    msgStrip.textContent = `${message.fromLabel} ── ${message.label} ──▶ ${message.toLabel}`;
    msgStrip.setAttribute('title', message.sort);
  }

  function renderStateStrip(strip: TourPlayerState['stateStrip']) {
    clear(stateStrip);
    if (!strip || strip.states.length === 0) {
      stateStrip.hidden = true;
      return;
    }
    stateStrip.hidden = false;
    strip.states.forEach((s, i) => {
      if (i > 0) stateStrip.append(h('span', { class: 'tour-state-sep' }, '·'));
      stateStrip.append(
        h(
          'span',
          { class: `tour-state${s.id === strip.currentId ? ' is-current' : ''}`, 'data-testid': 'tour-state' },
          s.name,
        ),
      );
    });
  }

  function render(state: TourPlayerState | null) {
    if (!state) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const step = state.scenario.steps[state.stepIndex];
    titleEl.textContent = state.scenario.title;
    caption.textContent = step?.caption ?? '';
    renderMessage(state.message);
    renderStateStrip(state.stateStrip);
    backBtn.disabled = state.stepIndex === 0;
    nextBtn.disabled = state.stepIndex >= state.stepCount - 1;
    renderDots(state.stepIndex, state.stepCount);
  }

  container.append(card);
  const unsubscribe = player.onChange(render);
  render(player.current());

  return {
    destroy() {
      unsubscribe();
      document.removeEventListener('keydown', onKeydown);
      card.remove();
    },
  };
}
