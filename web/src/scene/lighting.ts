// Lighting + ground for the real viewer.
//
// Cheap by design: a RoomEnvironment PMREM does all the interesting work
// (soft studio reflections on the block materials), one directional key adds
// a readable highlight direction, and a painted radial-gradient disc fakes a
// contact shadow. No shadow maps, no extra render passes -- the whole scene
// stays a couple of dozen draw calls.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ViewerTheme } from './viewer-api';

export interface Lighting {
  setTheme(theme: ViewerTheme): void;
  /** Ground disc opacity scales down as the car explodes apart. */
  setExplode(t: number): void;
  dispose(): void;
}

const DISC_OPACITY = 0.2;

/** Radial black->transparent gradient, used as the contact-shadow texture. */
function contactTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Add IBL + key light + contact disc to `scene`. `radius` sizes the disc to
 * the car's footprint.
 */
export function setupLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  radius = 3,
): Lighting {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.85;
  room.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry?.dispose();
  });

  // One soft key. Shadows off on purpose: the contact disc reads better and
  // costs one draw call instead of a whole shadow pass.
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3.5, 6, 4.5);
  key.castShadow = false;
  scene.add(key);
  const fill = new THREE.HemisphereLight(0xffffff, 0x203040, 0.35);
  scene.add(fill);

  const discTex = contactTexture();
  const discGeo = new THREE.PlaneGeometry(radius * 2.6, radius * 2.6);
  const discMat = new THREE.MeshBasicMaterial({
    map: discTex,
    color: 0x000000,
    transparent: true,
    opacity: DISC_OPACITY,
    depthWrite: false,
    toneMapped: false,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.002;
  disc.renderOrder = -2;
  disc.name = 'CONTACT_DISC';
  scene.add(disc);

  let explode = 0;
  let themeScale = 1;

  function applyDisc() {
    discMat.opacity = DISC_OPACITY * themeScale * (1 - 0.6 * explode);
  }

  return {
    setTheme(theme: ViewerTheme) {
      // Dark theme: a pure-black pool disappears into the background, so tint
      // it slightly and lighten it. Light theme: a plain dark pool reads as a
      // shadow.
      if (theme === 'light') {
        discMat.color.setHex(0x0f172a);
        themeScale = 1.15;
      } else {
        discMat.color.setHex(0x000814);
        themeScale = 0.9;
      }
      key.intensity = theme === 'light' ? 1.6 : 1.4;
      applyDisc();
    },
    setExplode(t: number) {
      explode = THREE.MathUtils.clamp(t, 0, 1);
      applyDisc();
    },
    dispose() {
      scene.environment = null;
      envRT.texture.dispose();
      pmrem.dispose();
      scene.remove(key, fill, disc);
      key.dispose();
      fill.dispose();
      discGeo.dispose();
      discTex.dispose();
      discMat.dispose();
    },
  };
}
