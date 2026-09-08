// Loads and sanity-checks data/model.json (docs/model-contract.md section 2).
// `loadModel` is the fetch-based entry point used by the app at runtime;
// `parseModel` is the pure validator so tests can exercise it without a
// network stack (and so `loadModel` doesn't duplicate the check).
import type { ModelJson } from './schema';

/** Top-level keys every consumer of data/model.json relies on. */
const REQUIRED_KEYS = ['meta', 'categories', 'elements', 'relationships', 'flows', 'hierarchy', 'stats'] as const;

/** Keys that must specifically be arrays (all except `hierarchy`, which is a record, and `meta`/`stats`, which are objects). */
const REQUIRED_ARRAY_KEYS = ['categories', 'elements', 'relationships', 'flows'] as const;

/**
 * Validate a parsed JSON value against the shape of `data/model.json`
 * (contract section 2). Throws a single readable `Error` listing every
 * problem found (missing/malformed keys), rather than failing on the first
 * one, so a broken data file is easy to diagnose in one shot.
 */
export function parseModel(json: unknown): ModelJson {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new Error(`Invalid model.json: expected a JSON object at the top level, got ${describe(json)}`);
  }

  const obj = json as Record<string, unknown>;
  const problems: string[] = [];

  const missing = REQUIRED_KEYS.filter((key) => !(key in obj));
  if (missing.length > 0) {
    problems.push(`missing key(s): ${missing.join(', ')}`);
  }

  for (const key of REQUIRED_ARRAY_KEYS) {
    if (key in obj && !Array.isArray(obj[key])) {
      problems.push(`"${key}" must be an array, got ${describe(obj[key])}`);
    }
  }

  if ('hierarchy' in obj && (typeof obj.hierarchy !== 'object' || obj.hierarchy === null || Array.isArray(obj.hierarchy))) {
    problems.push(`"hierarchy" must be an object, got ${describe(obj.hierarchy)}`);
  }

  if ('meta' in obj && (typeof obj.meta !== 'object' || obj.meta === null || Array.isArray(obj.meta))) {
    problems.push(`"meta" must be an object, got ${describe(obj.meta)}`);
  }

  if ('stats' in obj && (typeof obj.stats !== 'object' || obj.stats === null || Array.isArray(obj.stats))) {
    problems.push(`"stats" must be an object, got ${describe(obj.stats)}`);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid model.json: ${problems.join('; ')}`);
  }

  return obj as unknown as ModelJson;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value;
}

/**
 * Fetch `data/model.json` (or an equivalent URL) and validate it with
 * {@link parseModel}. Throws on a non-OK HTTP response or a malformed body.
 */
export async function loadModel(url: string): Promise<ModelJson> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch model at "${url}": ${reason}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch model at "${url}": HTTP ${response.status} ${response.statusText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse model at "${url}" as JSON: ${reason}`);
  }

  return parseModel(json);
}
