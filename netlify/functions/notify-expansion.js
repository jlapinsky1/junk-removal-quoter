import { getClientIp, jsonResponse, errorResponse } from './_shared/supabase.js';

/**
 * Captures an expansion-interest lead.
 *
 * To store leads persistently, connect this handler to your preferred backend:
 * - Supabase: insert into an `expansion_leads` table
 * - CRM: POST to HubSpot, Salesforce, etc.
 * - Email: forward via Resend or SendGrid
 *
 * Until then, leads are written to function logs so nothing is lost.
 */
export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = await req.json();
    const name = (body?.name || '').trim();
    const email = (body?.email || '').trim();
    const address = (body?.address || '').trim();

    if (!email) return errorResponse('Email is required');

    const ip = getClientIp(req);
    console.log('expansion_lead', JSON.stringify({ name, email, address, ip, ts: new Date().toISOString() }));

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('notify-expansion error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/notify-expansion' };
