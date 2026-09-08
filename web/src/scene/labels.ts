// The hover label: one CSS2DRenderer overlay with a single reused
// `.viewer-label` div, parked above the hovered block's bounding sphere.
//
// One div, reused -- not one per block -- so the DOM cost is constant and
// there is nothing to garbage-collect while the pointer sweeps the car.
//
// Styling lives here rather than in src/style.css because the scene owns it;
// the rule set is injected once and reads the app's theme tokens with plain
// fallbacks so it also looks right in the standalone dev harness.
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const STYLE_ID = 'viewer-label-style';

const CSS = `
.viewer-label {
  font: 500 12px/1.3 var(--font-sans, -apple-system, 'Segoe UI', Roboto, sans-serif);
  color: var(--color-text, #e5e7eb);
  background: color-mix(in srgb, var(--color-panel, #111827) 88%, transparent);
  border: 1px solid var(--color-border, #1f2937);
  border-radius: var(--radius-sm, 4px);
  padding: 3px 8px;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  transform: translateY(-6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.viewer-label[hidden] { display: none; }
`;

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export interface Labels {
  /** Park the label above `sphere` with `text`, or hide it when text is null. */
  show(text: string | null, sphere: THREE.Sphere | null): void;
  hide(): void;
  visible(): boolean;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

export function createLabels(container: HTMLElement, scene: THREE.Scene): Labels {
  injectStyle();

  const renderer = new CSS2DRenderer();
  const dom = renderer.domElement;
  dom.style.position = 'absolute';
  dom.style.top = '0';
  dom.style.left = '0';
  dom.style.pointerEvents = 'none';
  dom.style.overflow = 'hidden';
  container.appendChild(dom);

  const el = document.createElement('div');
  el.className = 'viewer-label';
  el.hidden = true;

  const object = new CSS2DObject(el);
  object.name = 'HOVER_LABEL';
  // The CSS2D layer is not raycast and not part of the picking set, but keep
  // it out of the way of Box3.setFromObject on the car root by parenting it
  // to the scene rather than to a block.
  scene.add(object);

  let shown = false;

  function hide() {
    if (!shown) return;
    el.hidden = true;
    shown = false;
  }

  return {
    show(text, sphere) {
      if (!text || !sphere) {
        hide();
        return;
      }
      if (el.textContent !== text) el.textContent = text;
      object.position.set(sphere.center.x, sphere.center.y + sphere.radius, sphere.center.z);
      el.hidden = false;
      shown = true;
    },
    hide,
    visible: () => shown,
    render(s, camera) {
      renderer.render(s, camera);
    },
    setSize(width, height) {
      renderer.setSize(width, height);
    },
    dispose() {
      object.removeFromParent();
      el.remove();
      dom.remove();
    },
  };
}
