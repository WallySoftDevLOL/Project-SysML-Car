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

  function render(state: TourPlayerState | null) {
    if (!state) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const step = state.scenario.steps[state.stepIndex];
    titleEl.textContent = state.scenario.title;
    caption.textContent = step?.caption ?? '';
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
