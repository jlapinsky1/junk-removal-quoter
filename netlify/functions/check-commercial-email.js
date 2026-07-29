import {
  getServiceClient,
  checkRateLimit,
  getClientIp,
  jsonResponse,
  errorResponse,
} from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return errorResponse('Email is required.');
    }

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      return errorResponse('Invalid email address.');
    }

    const supabase = getServiceClient();
    const ip = getClientIp(req);

    const allowed = await checkRateLimit(supabase, ip, 'check-commercial-email', 3600, 30);
    if (!allowed) return errorResponse('Too many requests. Please try again later.', 429);

    const { data: exists, error } = await supabase.rpc('commercial_email_registered', {
      p_email: normalized,
    });

    if (error) {
      console.error('check-commercial-email rpc error');
      return errorResponse('Unable to verify email.', 500);
    }

    return jsonResponse({ exists: !!exists });
  } catch {
    console.error('check-commercial-email error');
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/check-commercial-email' };
