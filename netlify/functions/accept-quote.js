import {
  getServiceClient, sha256, getClientIp, checkRateLimit,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const ip = getClientIp(req);
    const supabase = getServiceClient();

    // Rate limit: 10 acceptance attempts per IP per hour
    const allowed = await checkRateLimit(supabase, ip, 'accept-quote', 3600, 10);
    if (!allowed) {
      return errorResponse('Too many requests. Please wait.', 429);
    }

    const {
      token,
      resourceId,
      pickupDate,
      startTime,
      endTime,
      confirmations,
      idempotencyKey,
    } = await req.json();

    if (!token || !pickupDate || !startTime || !endTime || !confirmations) {
      return errorResponse('Missing required fields');
    }

    // Validate confirmations is an array of strings (the actual confirmation texts)
    if (!Array.isArray(confirmations) || confirmations.length < 3) {
      return errorResponse('All confirmations are required');
    }

    const tokenHash = await sha256(token);

    const { data, error } = await supabase.rpc('accept_quote_atomic', {
      p_token_hash: tokenHash,
      p_resource_id: resourceId || 'truck-1',
      p_pickup_date: pickupDate,
      p_start_time: startTime,
      p_end_time: endTime,
      p_confirmations: confirmations,
      p_idempotency_key: idempotencyKey || crypto.randomUUID(),
    });

    if (error) {
      console.error('accept_quote_atomic error:', error);
      return errorResponse('Unable to process this request', 500);
    }

    // RPC returns jsonb with success/error fields
    if (!data.success) {
      return errorResponse(data.error, 409);
    }

    return jsonResponse(data);
  } catch (e) {
    console.error('accept-quote error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/accept-quote' };
