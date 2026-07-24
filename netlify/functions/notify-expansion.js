import { getServiceClient, getClientIp, jsonResponse, errorResponse } from './_shared/supabase.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = await req.json();
    const email = (body?.email || '').trim();
    const name = (body?.name || '').trim();
    const zip = (body?.zip || '').trim();
    const testRunId = body?.testRunId || null;

    if (!email) {
      return errorResponse('email_required', 400);
    }
    if (!EMAIL_RE.test(email)) {
      return errorResponse('invalid_email', 400);
    }

    const ip = getClientIp(req);
    const supabase = getServiceClient();

    const { error } = await supabase.from('expansion_leads').insert({
      email,
      name: name || null,
      zip: zip || null,
      ip_address: ip,
      test_run_id: testRunId,
    });

    if (error) {
      console.error('expansion_lead insert error:', error);
      return errorResponse('Server error', 500);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('notify-expansion error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/notify-expansion' };
