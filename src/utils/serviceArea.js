/**
 * Client-side service-area utilities.
 *
 * Validation decisions are authoritative on the server (via /api/check-service-area
 * and /api/create-booking). These helpers are used for instant client-side
 * feedback before the API call is made.
 */

/** Returns true for a non-empty 5-digit string. */
export function isValidZip(zip) {
  return typeof zip === 'string' && /^\d{5}$/.test(zip.trim());
}

/**
 * Map a server-side reason code to the appropriate UI state.
 * Returns one of: 'serviceable' | 'outside' | 'unavailable' | 'invalid'
 */
export function reasonToUiState(reason) {
  if (reason === 'invalid_zip') return 'invalid';
  if (reason === 'unavailable') return 'unavailable';
  if (!reason || reason === 'serviceable' || reason === 'unconfigured' || reason === 'error') return 'serviceable';
  return 'outside'; // 'outside' | 'excluded'
}
