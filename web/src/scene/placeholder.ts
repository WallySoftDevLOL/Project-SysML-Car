// Minimal WORKING implementation of the Viewer contract (see viewer-api.ts):
// 13 labeled colored boxes standing in for the real car.glb blocks, with
// OrbitControls, raycast picking, and emissive highlighting. This makes the
// page interactive today; the real glTF-driven viewer replaces this file
// without main.ts or src/ui/* needing to change.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { HighlightState } from '../model/schema';
import type {
  CameraPose,
  FocusOptions,
  Viewer,
  ViewerEvent,
  ViewerPickEvent,
  ViewerTheme,
} from './viewer-api';

interface BlockDef {
  id: string;
  label: string;
  color: string;
  alpha: number;
  pos: [number, number, number];
  size: [number, number, number];
  explode: [number, number, number];
}

// Rough car-shaped layout. +Y up, +Z nose, +X car-left, meters, origin at
// ground center — matches docs/model-contract.md section 3. Positions and
// explode vectors are approximations mirroring data/blocks.json; the real
// viewer reads the authoritative values from model.json/blocks.json.
const BLOCKS: BlockDef[] = [
  { id: 'VEH', label: 'Whole vehicle', color: '#94A3B8', alpha: 0.35, pos: [0, 0.55, 0], size: [1.8, 1.1, 4.4], explode: [0, 0, 0] },
  { id: 'POWERTRAIN', label: 'Powertrain', color: '#F97316', alpha: 1, pos: [0, 0.3, -1.5], size: [0.9, 0.5, 0.9], explode: [0, 0.2, -1] },
  { id: 'INVERTER', label: 'Traction inverter', color: '#FDBA74', alpha: 1, pos: [0.3, 0.6, -1.5], size: [0.3, 0.25, 0.3], explode: [0, 1, -1] },
  { id: 'ENERGY', label: 'Battery pack', color: '#22C55E', alpha: 1, pos: [0, 0.15, 0], size: [1.6, 0.25, 2.6], explode: [0, -1, 0] },
  { id: 'BMS', label: 'Battery management', color: '#86EFAC', alpha: 1, pos: [0.5, 0.25, 0.4], size: [0.25, 0.2, 0.25], explode: [0.6, -0.3, 0.3] },
  { id: 'VCONTROL', label: 'Vehicle controller', color: '#3B82F6', alpha: 1, pos: [0, 0.5, 1.2], size: [0.5, 0.3, 0.4], explode: [0, 1, 0.3] },
  { id: 'BRAKES', label: 'Brakes', color: '#EF4444', alpha: 1, pos: [0, 0.2, 1.0], size: [1.6, 0.2, 0.3], explode: [0, -0.6, 0] },
  { id: 'THERMAL', label: 'Cooling system', color: '#22D3EE', alpha: 1, pos: [0, 0.5, 1.8], size: [1.0, 0.3, 0.4], explode: [0, 0.3, 1] },
  { id: 'THERM_CTRL', label: 'Thermal controller', color: '#A5F3FC', alpha: 1, pos: [0.3, 0.7, 1.8], size: [0.2, 0.2, 0.2], explode: [0.5, 0.6, 1] },
  { id: 'SENSORS', label: 'Sensors', color: '#A855F7', alpha: 1, pos: [0, 1.0, 2.0], size: [1.2, 0.15, 0.2], explode: [0, 1.2, 0] },
  { id: 'HMI', label: 'Driver interface', color: '#EC4899', alpha: 1, pos: [0, 0.7, 0.6], size: [1.0, 0.3, 0.3], explode: [0, 1, 0.5] },
  { id: 'CHARGE', label: 'Charging port', color: '#EAB308', alpha: 1, pos: [0.9, 0.4, 0.2], size: [0.2, 0.3, 0.4], explode: [1, 0.3, -0.5] },
  { id: 'DIAG', label: 'Diagnostics port', color: '#0D9488', alpha: 1, pos: [0.9, 0.3, -1.8], size: [0.2, 0.2, 0.3], explode: [1, 0.2, 0.4] },
];

const THEME_BG: Record<ViewerTheme, number> = { dark: 0x0b1220, light: 0xf1f5f9 };

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.3, 1);
  return sprite;
}

export function createPlaceholderViewer(container: HTMLElement): Viewer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(THEME_BG.dark);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(4, 3, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.4, 0);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(5, 8, 4);
  scene.add(dir);
  const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1f2937);
  scene.add(grid);

  const meshes = new Map<string, THREE.Mesh>();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const basePos = new Map<string, THREE.Vector3>();

  for (const b of BLOCKS) {
    const geo = new THREE.BoxGeometry(...b.size);
    const mat = new THREE.MeshStandardMaterial({
      color: b.color,
      transparent: b.alpha < 1,
      opacity: b.alpha,
      emissive: 0x000000,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...b.pos);
    mesh.name = b.id;
    mesh.userData.blockId = b.id;
    mesh.userData.explode = b.explode;
    scene.add(mesh);
    const label = makeLabelSprite(b.label);
    label.position.set(b.pos[0], b.pos[1] + b.size[1] / 2 + 0.25, b.pos[2]);
    mesh.add(label);
    meshes.set(b.id, mesh);
    materials.set(b.id, mat);
    basePos.set(b.id, mesh.position.clone());
  }

  const listeners: Record<ViewerEvent, Set<(e: ViewerPickEvent) => void>> = {
    pick: new Set(),
    hover: new Set(),
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredId: string | null = null;

  function pickAt(clientX: number, clientY: number): string | null {
    const rect = container.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...meshes.values()], false);
    return hits.length > 0 ? (hits[0]!.object.userData.blockId as string) : null;
  }

  function onPointerMove(e: PointerEvent) {
    const id = pickAt(e.clientX, e.clientY);
    if (id !== hoveredId) {
      hoveredId = id;
      listeners.hover.forEach((cb) => cb({ id }));
    }
  }
  function onClick(e: PointerEvent) {
    const id = pickAt(e.clientX, e.clientY);
    listeners.pick.forEach((cb) => cb({ id }));
  }
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let raf = 0;
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  // Simple camera tween shared by focus() and flyTo().
  let tween: { start: number; duration: number; from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null = null;
  function animateCamera(toPos: THREE.Vector3, toTarget: THREE.Vector3, duration: number) {
    tween = {
      start: performance.now(),
      duration: Math.max(1, duration),
      from: camera.position.clone(),
      to: toPos,
      fromT: controls.target.clone(),
      toT: toTarget,
    };
    controls.enabled = false;
    const step = () => {
      if (!tween) return;
      const t = Math.min(1, (performance.now() - tween.start) / tween.duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(tween.from, tween.to, ease);
      controls.target.lerpVectors(tween.fromT, tween.toT, ease);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        tween = null;
        controls.enabled = true;
      }
    };
    step();
  }

  function applyMaterialColor(id: string, mode: 'none' | 'primary' | 'secondary' | 'hover') {
    const mat = materials.get(id);
    if (!mat) return;
    if (mode === 'primary') mat.emissive.setHex(0xffffff), mat.emissiveIntensity = 0.6;
    else if (mode === 'secondary') mat.emissive.setHex(0xffffff), mat.emissiveIntensity = 0.25;
    else if (mode === 'hover') mat.emissive.setHex(0xffffff), mat.emissiveIntensity = 0.15;
    else mat.emissive.setHex(0x000000), mat.emissiveIntensity = 0;
  }

  let currentHighlight: HighlightState = { primary: new Set(), secondary: new Set() };
  function refreshHighlight() {
    for (const id of meshes.keys()) {
      if (id === hoveredId && !currentHighlight.primary.has(id)) applyMaterialColor(id, 'hover');
      else if (currentHighlight.primary.has(id)) applyMaterialColor(id, 'primary');
      else if (currentHighlight.secondary.has(id)) applyMaterialColor(id, 'secondary');
      else applyMaterialColor(id, 'none');
    }
  }

  const viewer: Viewer = {
    async load(_url: string) {
      // The placeholder never fetches a glb; it always shows the 13 stand-in
      // boxes above. Kept async to match the real viewer's signature.
      return { blocks: [...meshes.keys()], missing: [] };
    },
    setHighlight(h: HighlightState) {
      currentHighlight = h;
      refreshHighlight();
    },
    setHover(id: string | null) {
      hoveredId = id;
      refreshHighlight();
    },
    setXray(on: boolean) {
      const veh = materials.get('VEH');
      if (veh) veh.opacity = on ? 0.06 : 0.35;
    },
    setExplode(t: number) {
      for (const [id, mesh] of meshes) {
        const base = basePos.get(id)!;
        const [ex, ey, ez] = mesh.userData.explode as [number, number, number];
        mesh.position.set(base.x + ex * t, base.y + ey * t, base.z + ez * t);
      }
    },
    focus(blockId: string | null, opts?: FocusOptions) {
      const duration = opts?.duration ?? 500;
      if (blockId === null) {
        animateCamera(new THREE.Vector3(4, 3, 5), new THREE.Vector3(0, 0.4, 0), duration);
        return;
      }
      const mesh = meshes.get(blockId);
      if (!mesh) return;
      const dist = 2.5 * (opts?.distance ?? 1);
      const target = mesh.position.clone();
      const dir3 = new THREE.Vector3(1, 0.6, 1).normalize();
      animateCamera(target.clone().addScaledVector(dir3, dist), target, duration);
    },
    flyTo(pose: CameraPose, duration = 800) {
      animateCamera(
        new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z),
        new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z),
        duration,
      );
      if (pose.fov) {
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
      }
    },
    setAutoRotate(on: boolean) {
      controls.autoRotate = on;
      controls.autoRotateSpeed = 1.2;
    },
    setTheme(theme: ViewerTheme) {
      scene.background = new THREE.Color(THEME_BG[theme]);
    },
    projectBlock(id: string) {
      const mesh = meshes.get(id);
      if (!mesh) return null;
      const v = mesh.position.clone().project(camera);
      if (v.z > 1) return null;
      return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
    },
    on(event: ViewerEvent, cb: (e: ViewerPickEvent) => void) {
      listeners[event].add(cb);
      return () => listeners[event].delete(cb);
    },
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      for (const mesh of meshes.values()) {
        mesh.geometry.dispose();
      }
      for (const mat of materials.values()) mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  return viewer;
}
