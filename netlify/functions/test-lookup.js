/**
 * Test-only data lookup endpoint.
 *
 * Security requirements:
 *   - Returns 404 when disabled (does not reveal its existence in production)
 *   - Only activates when NODE_ENV=test AND ENABLE_TEST_ENDPOINTS=true
 *   - Requires X-Test-Secret header matching TEST_LOOKUP_SECRET via constant-time comparison
 *   - All queries are scoped to testRunId to prevent cross-run contamination
 *
 * Never enable this endpoint outside a dedicated test environment.
 */

import { getServiceClient, jsonResponse } from './_shared/supabase.js';
import crypto from 'crypto';

const NOT_FOUND = () => new Response(null, { status: 404 });

function isEnabled() {
  return (
    process.env.NODE_ENV === 'test' &&
    process.env.ENABLE_TEST_ENDPOINTS === 'true' &&
    !!process.env.TEST_LOOKUP_SECRET
  );
}

function verifySecret(req) {
  const provided = req.headers.get('x-test-secret') || '';
  const expected = process.env.TEST_LOOKUP_SECRET || '';
  if (provided.length === 0 || expected.length === 0) return false;
  // Constant-time comparison to prevent timing attacks
  try {
    const a = Buffer.from(provided.padEnd(64, '\0').slice(0, 64));
    const b = Buffer.from(expected.padEnd(64, '\0').slice(0, 64));
    return crypto.timingSafeEqual(a, b) && provided === expected;
  } catch {
    return false;
  }
}

export default async function handler(req) {
  if (!isEnabled()) return NOT_FOUND();
  if (!verifySecret(req)) return NOT_FOUND();

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const testRunId = url.searchParams.get('testRunId');
  const supabase = getServiceClient();

  try {
    // ── GET operations ────────────────────────────────────────────────────────
    if (req.method === 'GET') {

      if (type === 'booking') {
        if (!testRunId) return NOT_FOUND();
        const idempotencyKey = url.searchParams.get('idempotencyKey');
        if (!idempotencyKey) return NOT_FOUND();
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .eq('test_run_id', testRunId)
          .maybeSingle();
        if (error || !data) return NOT_FOUND();
        return jsonResponse(data);
      }

      if (type === 'booking_count') {
        if (!testRunId) return NOT_FOUND();
        const idempotencyKey = url.searchParams.get('idempotencyKey');
        if (!idempotencyKey) return NOT_FOUND();
        const { count, error } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('idempotency_key', idempotencyKey)
          .eq('test_run_id', testRunId);
        if (error) return NOT_FOUND();
        return jsonResponse({ count: count ?? 0 });
      }

      if (type === 'expansion_lead') {
        if (!testRunId) return NOT_FOUND();
        const email = url.searchParams.get('email');
        if (!email) return NOT_FOUND();
        const { data, error } = await supabase
          .from('expansion_leads')
          .select('*')
          .eq('email', email)
          .eq('test_run_id', testRunId)
          .maybeSingle();
        if (error || !data) return NOT_FOUND();
        return jsonResponse(data);
      }

      if (type === 'service_area') {
        // Import dynamically to avoid module-level side effects
        const { loadServiceAreaConfig } = await import('./_shared/serviceArea.js');
        const config = await loadServiceAreaConfig();
        return jsonResponse(config);
      }

      return NOT_FOUND();
    }

    // ── DELETE operation ──────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (type === 'test_run') {
        if (!testRunId) return NOT_FOUND();

        await Promise.all([
          supabase.from('bookings').delete().eq('test_run_id', testRunId),
          supabase.from('expansion_leads').delete().eq('test_run_id', testRunId),
        ]);

        return jsonResponse({ deleted: true, testRunId });
      }

      return NOT_FOUND();
    }

    return NOT_FOUND();
  } catch (e) {
    console.error('test-lookup error:', e);
    return NOT_FOUND();
  }
}

export const config = { path: '/api/test/lookup' };
