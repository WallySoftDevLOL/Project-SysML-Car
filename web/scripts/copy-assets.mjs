// Copies generated build artifacts into web/public so Vite can serve them.
// Run automatically before `dev` and `build` (see package.json scripts).
//
// - dist/car.glb            -> web/public/car.glb            (skip + notice if missing)
// - data/model.json         -> web/public/data/model.json    (fall back to the test
//                                                              fixture so dev never 404s)
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..');
const repoRoot = resolve(webRoot, '..');
const publicDir = join(webRoot, 'public');

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copy(src, dest, label) {
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
  console.log(`[copy-assets] copied ${label} -> ${dest}`);
}

// 1. car.glb
const glbSrc = join(repoRoot, 'dist', 'car.glb');
const glbDest = join(publicDir, 'car.glb');
if (existsSync(glbSrc)) {
  copy(glbSrc, glbDest, 'dist/car.glb');
} else {
  console.log(
    `[copy-assets] notice: ${glbSrc} not found yet. ` +
      'The viewer will fall back to placeholder boxes until the Blender build produces car.glb.',
  );
}

// 2. model.json (fall back to the sample fixture so dev/build never 404s)
const modelSrc = join(repoRoot, 'data', 'model.json');
const modelDest = join(publicDir, 'data', 'model.json');
if (existsSync(modelSrc)) {
  copy(modelSrc, modelDest, 'data/model.json');
} else {
  const fixtureSrc = join(webRoot, 'tests', 'fixtures', 'model.sample.json');
  if (existsSync(fixtureSrc)) {
    copy(fixtureSrc, modelDest, 'tests/fixtures/model.sample.json (fallback)');
    console.log(
      '[copy-assets] notice: data/model.json not found yet. Using the sample fixture instead.',
    );
  } else {
    console.warn(
      `[copy-assets] warning: neither ${modelSrc} nor the sample fixture exist. ` +
        'public/data/model.json was not written.',
    );
  }
}
