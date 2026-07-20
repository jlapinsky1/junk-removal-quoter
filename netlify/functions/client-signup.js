import { getServiceClient, jsonResponse, errorResponse } from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { email, password, contactName } = await req.json();

    if (!email || !password) return errorResponse('Email and password are required');
    if (password.length < 8) return errorResponse('Password must be at least 8 characters');

    const supabase = getServiceClient();

    // Create user with admin API — auto-confirms email
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { contact_name: contactName || '' },
    });

    if (error) {
      if (error.message?.includes('already been registered')) {
        return errorResponse('An account with this email already exists. Please log in.', 409);
      }
      throw error;
    }

    return jsonResponse({ success: true, userId: data.user.id });
  } catch (err) {
    console.error('Client signup error:', err);
    return errorResponse(err.message || 'Signup failed', 500);
  }
}
