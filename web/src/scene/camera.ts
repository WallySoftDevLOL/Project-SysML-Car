// Camera framing and tweening.
//
// One tween at a time: focus() and flyTo() both cancel whatever was running.
// OrbitControls is disabled for the duration so a stray drag can't fight the
// animation, then handed back exactly as it was.
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraPose } from './viewer-api';

export const MIN_DISTANCE = 3;
export const MAX_DISTANCE = 14;
/** Three-quarter front-left: nose is +Z and +X is the car's left side. */
export const DEFAULT_DIR = new THREE.Vector3(0.85, 0.5, 1.15).normalize();
export const DEFAULT_DURATION = 600;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Tween {
  start: number;
  duration: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

export interface CameraRig {
  /** Frame a bounding box, keeping the current view direction. */
  frameBox(box: THREE.Box3, duration: number, distanceScale?: number): void;
  /** Frame a box from the default three-quarter view. */
  frameDefault(box: THREE.Box3, duration: number, distanceScale?: number): void;
  flyTo(pose: CameraPose, duration: number): void;
  /** Advance the tween. Returns true while one is still running. */
  update(now: number): boolean;
  active(): boolean;
  cancel(): void;
  /**
   * Project a world point into the container. `x`/`y` are normalised 0..1
   * from the top-left (the viewer-api contract); `px`/`py` are the same point
   * in CSS pixels. Null when the point is behind the camera.
   */
  project(point: THREE.Vector3): { x: number; y: number; px: number; py: number } | null;
}

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  container: HTMLElement,
  requestRender: () => void,
  reducedMotion: () => boolean,
): CameraRig {
  let tween: Tween | null = null;
  let controlsWereEnabled = true;

  const _dir = new THREE.Vector3();
  const _pos = new THREE.Vector3();
  const _proj = new THREE.Vector3();
  const _center = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _corner = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  /** Fraction of the frame the subject should leave empty as breathing room. */
  const PADDING = 1.12;

  /**
   * Exact fit for a box seen from `dir`.
   *
   * For a camera at `center + dir * d`, a corner sits at forward distance
   * `d - f` with lateral offsets `r` and `u`, so it stays inside the frustum
   * when `d >= f + r / tan(hFov/2)` and `d >= f + u / tan(vFov/2)`. Taking
   * the max over all eight corners is the smallest distance that shows the
   * whole box -- much tighter than fitting the bounding sphere, which for a
   * car-shaped box would sit the camera ~40% too far back.
   */
  function fitDistance(box: THREE.Box3, dir: THREE.Vector3, scale: number): number {
    const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const hTan = vTan * camera.aspect;
    box.getCenter(_center);
    _right.crossVectors(dir, WORLD_UP);
    if (_right.lengthSq() < 1e-6) _right.set(1, 0, 0);
    _right.normalize();
    _up.crossVectors(_right, dir).normalize();

    let d = 0;
    for (let i = 0; i < 8; i++) {
      _corner.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      );
      _corner.sub(_center);
      const f = _corner.dot(dir);
      const r = Math.abs(_corner.dot(_right));
      const u = Math.abs(_corner.dot(_up));
      d = Math.max(d, f + r / hTan, f + u / vTan);
    }
    return THREE.MathUtils.clamp(d * PADDING * scale, MIN_DISTANCE, MAX_DISTANCE);
  }

  function begin(toPos: THREE.Vector3, toTarget: THREE.Vector3, duration: number) {
    cancel();
    if (duration <= 0 || reducedMotion()) {
      camera.position.copy(toPos);
      controls.target.copy(toTarget);
      controls.update();
      requestRender();
      return;
    }
    controlsWereEnabled = controls.enabled;
    controls.enabled = false;
    tween = {
      start: performance.now(),
      duration,
      fromPos: camera.position.clone(),
      toPos: toPos.clone(),
      fromTarget: controls.target.clone(),
      toTarget: toTarget.clone(),
    };
    requestRender();
  }

  function cancel() {
    if (!tween) return;
    tween = null;
    controls.enabled = controlsWereEnabled;
  }

  function frameFrom(
    dir: THREE.Vector3,
    box: THREE.Box3,
    duration: number,
    distanceScale: number,
  ) {
    const dist = fitDistance(box, dir, distanceScale);
    box.getCenter(_center);
    _pos.copy(_center).addScaledVector(dir, dist);
    // Never drop below the ground plane: the car is not meant to be seen from
    // underneath (same reason controls clamp maxPolarAngle).
    _pos.y = Math.max(_pos.y, 0.35);
    begin(_pos, _center, duration);
  }

  return {
    frameBox(box, duration, distanceScale = 1) {
      _dir.copy(camera.position).sub(controls.target);
      if (_dir.lengthSq() < 1e-6) _dir.copy(DEFAULT_DIR);
      _dir.normalize();
      frameFrom(_dir, box, duration, distanceScale);
    },
    frameDefault(box, duration, distanceScale = 1) {
      frameFrom(DEFAULT_DIR, box, duration, distanceScale);
    },
    flyTo(pose, duration) {
      if (pose.fov !== undefined && pose.fov !== camera.fov) {
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
      }
      begin(
        new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z),
        new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z),
        duration,
      );
    },
    update(now) {
      if (!tween) return false;
      const raw = (now - tween.start) / tween.duration;
      const k = easeInOutCubic(Math.min(1, Math.max(0, raw)));
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      if (raw >= 1) {
        camera.position.copy(tween.toPos);
        controls.target.copy(tween.toTarget);
        cancel();
        return false;
      }
      return true;
    },
    active: () => tween !== null,
    cancel,
    project(point) {
      _proj.copy(point).project(camera);
      // z > 1 means behind the far plane / behind the camera after the
      // perspective divide.
      if (_proj.z > 1 || !Number.isFinite(_proj.x) || !Number.isFinite(_proj.y)) return null;
      const x = (_proj.x + 1) / 2;
      const y = (1 - _proj.y) / 2;
      return {
        x,
        y,
        px: x * container.clientWidth,
        py: y * container.clientHeight,
      };
    },
  };
}
