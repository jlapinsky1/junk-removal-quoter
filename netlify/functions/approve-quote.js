import {
  getServiceClient, verifyAdmin, generateToken, sha256,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const {
      bookingId,
      approvedPrice,
      recommendedPrice,
      estimateSnapshot,
      settingsSnapshot,
      availableSlots,
      expiresAt,
      customerTerms,
      adminOverride,
      decisionContext,
    } = await req.json();

    if (!bookingId || approvedPrice == null || !estimateSnapshot || !customerTerms) {
      return errorResponse('Missing required fields');
    }

    const supabase = getServiceClient();

    // Generate token: raw goes to customer URL, hash stored in DB
    const rawToken = generateToken();
    const tokenHash = await sha256(rawToken);

    const { data, error } = await supabase.rpc('approve_quote_atomic', {
      p_booking_id: bookingId,
      p_admin_id: admin.id,
      p_approved_price: approvedPrice,
      p_recommended_price: recommendedPrice || approvedPrice,
      p_estimate_snapshot: estimateSnapshot,
      p_settings_snapshot: settingsSnapshot || {},
      p_available_slots: availableSlots || [],
      p_expires_at: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      p_customer_terms: customerTerms,
      p_admin_override: adminOverride || null,
      p_token_hash: tokenHash,
      p_decision_context: decisionContext || null,
    });

    if (error) {
      console.error('approve_quote_atomic error:', error);
      return errorResponse(error.message || 'Approval failed', 500);
    }

    return jsonResponse({
      ...data,
      quoteToken: rawToken, // only returned once — admin sends this to customer
    });
  } catch (e) {
    console.error('approve-quote error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/approve-quote' };
