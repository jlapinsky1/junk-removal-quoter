import {
  getServiceClient, sha256,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';
import { calculateDepositCents } from './_shared/stripe.js';

export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return errorResponse('token is required');

    const tokenHash = await sha256(token);
    const supabase = getServiceClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        id, status, unit, description, estimate,
        quote_expires_at, deposit_confirmed_at,
        properties!inner(name, address,
          commercial_clients!inner(company_name, contact_name)
        )
      `)
      .eq('quote_token_hash', tokenHash)
      .single();

    if (error || !job) return errorResponse('Quote not found or expired', 404);

    if (!['quote_sent', 'awaiting_payment', 'scheduled', 'in_progress', 'completed'].includes(job.status)) {
      return errorResponse('This quote is no longer available', 410);
    }

    if (job.quote_expires_at && new Date(job.quote_expires_at) < new Date()) {
      return errorResponse('This quote has expired', 410);
    }

    const estimateCents = Math.round(Number(job.estimate) * 100);
    const depositCents = calculateDepositCents(estimateCents);

    return jsonResponse({
      jobId: job.id,
      status: job.status,
      propertyName: job.properties.name,
      propertyAddress: job.properties.address,
      unit: job.unit,
      description: job.description,
      estimate: job.estimate,
      estimateCents,
      depositCents,
      depositAmount: depositCents / 100,
      balanceDueCents: estimateCents - depositCents,
      expiresAt: job.quote_expires_at,
      depositConfirmedAt: job.deposit_confirmed_at,
      companyName: job.properties.commercial_clients.company_name,
      contactName: job.properties.commercial_clients.contact_name,
    });
  } catch (e) {
    console.error('get-commercial-quote error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/get-commercial-quote' };
