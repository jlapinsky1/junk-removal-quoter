import {
  getServiceClient, verifyAdmin,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

const STATUS_ORDER = [
  'pending_review', 'quote_sent', 'awaiting_payment',
  'scheduled', 'in_progress', 'completed', 'cancelled',
];

export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const supabase = getServiceClient();

    let query = supabase
      .from('jobs')
      .select(`
        id, status, unit, description, preferred_date, created_at,
        estimate, deposit_confirmed_at, financially_completed_at,
        quote_sent_at, scheduled_date,
        properties!inner(id, name, address, client_id,
          commercial_clients!inner(id, company_name, contact_name, phone)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(
        `description.ilike.%${search}%,unit.ilike.%${search}%,properties.name.ilike.%${search}%`
      );
    }

    const { data: jobs, error, count } = await query;
    if (error) {
      console.error('get-admin-commercial-jobs error:', error);
      return errorResponse('Failed to load jobs', 500);
    }

    const formatted = (jobs || []).map(j => ({
      id: j.id,
      status: j.status,
      unit: j.unit,
      description: j.description,
      preferredDate: j.preferred_date,
      createdAt: j.created_at,
      estimate: j.estimate,
      depositConfirmedAt: j.deposit_confirmed_at,
      financiallyCompletedAt: j.financially_completed_at,
      quoteSentAt: j.quote_sent_at,
      scheduledDate: j.scheduled_date,
      property: {
        id: j.properties.id,
        name: j.properties.name,
        address: j.properties.address,
      },
      client: {
        id: j.properties.commercial_clients.id,
        companyName: j.properties.commercial_clients.company_name,
        contactName: j.properties.commercial_clients.contact_name,
        phone: j.properties.commercial_clients.phone,
      },
    }));

    return jsonResponse({ jobs: formatted, total: count ?? 0, page, limit });
  } catch (e) {
    console.error('get-admin-commercial-jobs error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/get-admin-commercial-jobs' };
