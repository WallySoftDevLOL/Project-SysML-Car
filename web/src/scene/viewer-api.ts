// The contract between src/main.ts (and later, src/ui/*) and whatever three.js
// scene implementation is mounted. src/scene/placeholder.ts implements this
// today with 13 labeled boxes; the real glTF-driven viewer must implement the
// exact same interface so main.ts and the UI never need to change.
import type { BlockId, HighlightState } from '../model/schema';

/** Options for {@link Viewer.focus}. */
export interface FocusOptions {
  /** Camera transition duration in ms. Defaults to an implementation-chosen value. */
  duration?: number;
  /** Multiplier on the default framing distance. 1 = default fit. */
  distance?: number;
}

/** A camera pose for {@link Viewer.flyTo}. */
export interface CameraPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov?: number;
}

export type ViewerTheme = 'dark' | 'light';

export type ViewerEvent = 'pick' | 'hover';

/** Payload delivered to `pick`/`hover` listeners. `null` id means "nothing under the cursor". */
export interface ViewerPickEvent {
  id: BlockId | null;
}

/**
 * The scene-layer contract. Any implementation (placeholder boxes today, the
 * real glTF viewer later) must satisfy this interface exactly so main.ts and
 * src/ui/* never need to branch on which one is mounted.
 */
export interface Viewer {
  /**
   * Load a glTF/GLB (or any future asset) into the scene. Resolves with the
   * block ids that were actually found as nodes/meshes, and the ids that the
   * caller expected (e.g. from blocks.json) but were not present, so the UI
   * can warn without crashing.
   */
  load(url: string): Promise<{ blocks: BlockId[]; missing: BlockId[] }>;

  /** Set which blocks are highlighted as primary vs. secondary (e.g. after a selection). */
  setHighlight(highlight: HighlightState): void;

  /** Set (or clear, with null) the hovered block, independent of highlight/selection. */
  setHover(id: BlockId | null): void;

  /** Toggle x-ray mode (the outer shell goes translucent so inner blocks are visible). */
  setXray(on: boolean): void;

  /**
   * Set the explode amount, 0..1. 0 is the assembled car; 1 fully separates
   * blocks along their `explode` vectors from blocks.json/model.json.
   */
  setExplode(t: number): void;

  /**
   * Frame the camera on a block, or (with null) reset to the default
   * whole-car framing.
   */
  focus(blockId: BlockId | null, opts?: FocusOptions): void;

  /** Animate the camera to an explicit pose over `duration` ms (default implementation-chosen). */
  flyTo(pose: CameraPose, duration?: number): void;

  /** Toggle a slow idle rotation of the camera around the car. */
  setAutoRotate(on: boolean): void;

  /** Update scene-side theming (background, line colors) to match the UI theme. */
  setTheme(theme: ViewerTheme): void;

  /**
   * Project a block's world position to normalized viewport coordinates
   * (0..1 in each axis, origin top-left), or null if the block is unknown or
   * behind the camera. Used by the UI to draw call-outs/leader lines.
   */
  projectBlock(id: BlockId): { x: number; y: number } | null;

  /** Subscribe to a scene event. Returns an unsubscribe function. */
  on(event: ViewerEvent, cb: (e: ViewerPickEvent) => void): () => void;

  /** Tear down the renderer, listeners, and any RAF loop. */
  dispose(): void;
}
