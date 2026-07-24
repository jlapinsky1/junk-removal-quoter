import { getStore } from '@netlify/blobs';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG = {
  mode: 'zip-list',
  centerZip: '',
  radiusMiles: 30,
  serviceableZips: [],
  excludedZips: [],
  unavailableZips: [],
  updatedAt: '',
  updatedBy: '',
};

const STORE_NAME = 'business-config';
const CONFIG_KEY = 'service-area';
const CACHE_TTL_MS = 30_000; // 30 seconds

// Module-level cache (per function instance)
let _cache = null;
let _cacheAt = 0;

// ─── ZIP utilities ────────────────────────────────────────────────────────────

/** Returns true if the value is a non-empty five-digit US ZIP string. */
export function isValidZip(zip) {
  return typeof zip === 'string' && /^\d{5}$/.test(zip.trim());
}

/** Trim, deduplicate, and discard invalid entries from a ZIP array. */
export function normalizeAndDedupeZips(zips) {
  if (!Array.isArray(zips)) return [];
  const seen = new Set();
  const out = [];
  for (const z of zips) {
    const t = (z || '').trim();
    if (isValidZip(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Parse a comma-separated env string of ZIPs into a clean array. */
export function parseEnvZipList(envString) {
  return normalizeAndDedupeZips((envString || '').split(','));
}

// ─── Config I/O ───────────────────────────────────────────────────────────────

/**
 * Build a minimal config from environment variables.
 * Used on first run (before admin has saved anything) and as a fallback
 * when Netlify Blobs is unreachable.
 */
export function buildFromEnv() {
  return {
    ...DEFAULT_CONFIG,
    serviceableZips: parseEnvZipList(process.env.SERVICE_AREA_SERVICEABLE_ZIPS),
    excludedZips: parseEnvZipList(process.env.SERVICE_AREA_EXCLUDED_ZIPS),
    radiusMiles: parseFloat(process.env.SERVICE_AREA_RADIUS_MILES || '30'),
  };
}

/** Invalidate the in-memory cache (call after a write). */
export function invalidateConfigCache() {
  _cache = null;
  _cacheAt = 0;
}

/**
 * Load the service-area configuration.
 *
 * Priority:
 *   1. In-memory cache (< 30 s old)
 *   2. Netlify Blobs
 *   3. Environment-variable fallback  (first run / Blobs unreachable)
 *
 * On first run (Blobs key is missing), migrates env-var values into Blobs
 * so subsequent reads are served from there.
 */
export async function loadServiceAreaConfig() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }

  let store;
  try {
    store = getStore({ name: STORE_NAME, consistency: 'strong' });
  } catch (e) {
    // Blobs context unavailable (e.g., running in tests or local Node.js)
    console.warn('[serviceArea] Blobs context unavailable, using env fallback:', e.message);
    return buildFromEnv();
  }

  try {
    const stored = await store.get(CONFIG_KEY, { type: 'json' });

    if (stored) {
      _cache = { ...DEFAULT_CONFIG, ...stored };
      _cacheAt = Date.now();
      return _cache;
    }

    // First run: nothing stored yet — seed from env vars
    const migrated = buildFromEnv();
    try {
      await store.set(CONFIG_KEY, JSON.stringify(migrated));
    } catch (writeErr) {
      console.warn('[serviceArea] Could not seed Blobs on first run:', writeErr.message);
    }
    _cache = migrated;
    _cacheAt = Date.now();
    return migrated;
  } catch (e) {
    console.warn('[serviceArea] Blobs read failed, using env fallback:', e.message);
    return buildFromEnv();
  }
}

/**
 * Persist a new service-area configuration to Netlify Blobs
 * and update the in-memory cache.
 */
export async function saveServiceAreaConfig(config) {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  await store.set(CONFIG_KEY, JSON.stringify(config));
  _cache = config;
  _cacheAt = Date.now();
}

// ─── Validation logic ─────────────────────────────────────────────────────────

/**
 * Pure ZIP evaluation against a loaded config object.
 *
 * Priority:
 *   1. Invalid format          → { serviceable: false, reason: 'invalid_zip' }
 *   2. excludedZips            → { serviceable: false, reason: 'excluded' }
 *   3. unavailableZips         → { serviceable: false, reason: 'unavailable' }
 *   4. serviceableZips         → { serviceable: true,  reason: 'serviceable' }
 *   5. No lists configured     → { serviceable: true,  reason: 'unconfigured' }
 *   6. Not in serviceable list → { serviceable: false, reason: 'outside' }
 *
 * @param {string} zip
 * @param {object} config
 * @returns {{ serviceable: boolean, reason: string }}
 */
export function evaluateZip(zip, config) {
  if (!isValidZip((zip || '').trim())) {
    return { serviceable: false, reason: 'invalid_zip' };
  }

  const z = zip.trim();

  if (config.excludedZips?.includes(z)) {
    return { serviceable: false, reason: 'excluded' };
  }

  if (config.unavailableZips?.includes(z)) {
    return { serviceable: false, reason: 'unavailable' };
  }

  // If no lists have been configured yet, fail open so the site works
  // before the admin has set anything up.
  const hasConfig =
    (config.serviceableZips?.length ?? 0) > 0 ||
    (config.excludedZips?.length ?? 0) > 0 ||
    (config.unavailableZips?.length ?? 0) > 0;

  if (!hasConfig) {
    return { serviceable: true, reason: 'unconfigured' };
  }

  if (config.serviceableZips?.includes(z)) {
    return { serviceable: true, reason: 'serviceable' };
  }

  return { serviceable: false, reason: 'outside' };
}

/**
 * Server-side service-area check for use in Netlify functions.
 *
 * Accepts either a bare 5-digit ZIP or a full address string (extracts
 * the last 5-digit sequence, for backward compat with create-booking).
 *
 * Fails open on infrastructure errors so a Blobs outage never blocks
 * legitimate customers.
 *
 * @param {string} zipOrAddress
 * @returns {Promise<{ serviceable: boolean, reason: string }>}
 */
export async function checkServiceAreaServer(zipOrAddress) {
  // If it's a bare 5-digit ZIP, use it directly; otherwise extract from address
  const bare = (zipOrAddress || '').trim();
  const zip = isValidZip(bare)
    ? bare
    : (bare.match(/\b(\d{5})\b/) || [])[1] || '';

  if (!zip) {
    return { serviceable: false, reason: 'invalid_zip' };
  }

  let config;
  try {
    config = await loadServiceAreaConfig();
  } catch (e) {
    console.warn('[serviceArea] Config load error, failing open:', e.message);
    return { serviceable: true, reason: 'error' };
  }

  return evaluateZip(zip, config);
}
