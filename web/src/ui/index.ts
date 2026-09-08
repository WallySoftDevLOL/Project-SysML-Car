// Public entry point for the panel UI. Composes toolbar.ts + panel.ts against
// the store and a ModelIndex handed in by the caller (main.ts).
import type { Store } from '../state/store';
import type { ModelIndex } from '../model/index';
import { mountToolbar } from './toolbar';
import { mountPanel } from './panel';

export type { ModelIndex } from '../model/index';

export interface MountUIDeps {
  root: HTMLElement;
  toolbar: HTMLElement;
  store: Store;
  idx: ModelIndex;
  palette: Record<string, string>;
  onFocusBlock(id: string | null): void;
  onTourRequest?: (scenarioId: string) => void;
  /** Populates the toolbar's Tour dropdown; the dropdown is hidden if omitted or empty. */
  scenarios?: Array<{ id: string; title: string }>;
}

export interface MountUIHandle {
  destroy(): void;
}

export function mountUI(deps: MountUIDeps): MountUIHandle {
  const toolbarHandle = mountToolbar(deps.toolbar, deps.store, {
    scenarios: deps.scenarios,
    onTourRequest: deps.onTourRequest,
  });

  const panelHandle = mountPanel({
    root: deps.root,
    store: deps.store,
    idx: deps.idx,
    palette: deps.palette,
    onFocusBlock: deps.onFocusBlock,
    onTourRequest: deps.onTourRequest,
    scenarios: deps.scenarios,
  });

  return {
    destroy() {
      toolbarHandle.destroy();
      panelHandle.destroy();
    },
  };
}
