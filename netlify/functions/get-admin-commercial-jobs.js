import {
  getServiceClient, verifyAdmin,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

function sanitizeSearchTerm(value) {
  return String(value || '').trim().replace(/[%_,]/g, '');
}

async function findPropertyIdsForSearch(supabase, search) {
  const term = `%${search}%`;
  const propertyIds = new Set();

  const { data: clients } = await supabase
    .from('commercial_clients')
    .select('id')
    .or(`company_name.ilike.${term},contact_name.ilike.${term}`);

  const clientIds = (clients || []).map((c) => c.id);
  if (clientIds.length > 0) {
    const { data: clientProps } = await supabase
      .from('properties')
      .select('id')
      .in('client_id', clientIds);
    (clientProps || []).forEach((p) => propertyIds.add(p.id));
  }

  const { data: namedProps } = await supabase
    .from('properties')
    .select('id')
    .or(`name.ilike.${term},address.ilike.${term}`);
  (namedProps || []).forEach((p) => propertyIds.add(p.id));

  return [...propertyIds];
}

function formatJobRow(j, clientMap) {
  const property = j.properties || {};
  const client = clientMap[property.client_id] || {};

  return {
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
      id: property.id,
      name: property.name,
      address: property.address,
    },
    client: {
      id: client.id || null,
      companyName: client.company_name || null,
      contactName: client.contact_name || null,
      phone: client.phone || null,
    },
  };
}

export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const search = sanitizeSearchTerm(url.searchParams.get('search') || '');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const supabase = getServiceClient();

    const selectFields = `
      id, status, unit, description, preferred_date, created_at,
      estimate, deposit_confirmed_at, financially_completed_at,
      quote_sent_at, scheduled_date, property_id,
      properties(id, name, address, client_id)
    `;

    let jobs = [];
    let total = 0;

    if (search) {
      const propertyIds = await findPropertyIdsForSearch(supabase, search);
      const term = `%${search}%`;
      const orParts = [`description.ilike.${term}`, `unit.ilike.${term}`];
      if (propertyIds.length > 0) {
        orParts.push(`property_id.in.(${propertyIds.join(',')})`);
      }

      let query = supabase
        .from('jobs')
        .select(selectFields)
        .or(orParts.join(','))
        .order('created_at', { ascending: false })
        .limit(200);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) {
        console.error('get-admin-commercial-jobs search error:', error.message || error);
        return errorResponse('Failed to load jobs', 500);
      }

      jobs = data || [];
      total = jobs.length;
      jobs = jobs.slice(offset, offset + limit);
    } else {
      let query = supabase
        .from('jobs')
        .select(selectFields, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;
      if (error) {
        console.error('get-admin-commercial-jobs error:', error.message || error);
        return errorResponse('Failed to load jobs', 500);
      }

      jobs = data || [];
      total = count ?? jobs.length;
    }

    const clientIds = [...new Set(jobs.map((j) => j.properties?.client_id).filter(Boolean))];
    let clientMap = {};

    if (clientIds.length > 0) {
      const { data: clients, error: clientErr } = await supabase
        .from('commercial_clients')
        .select('id, company_name, contact_name, phone')
        .in('id', clientIds);

      if (clientErr) {
        console.error('get-admin-commercial-jobs clients error:', clientErr.message || clientErr);
      } else {
        clientMap = Object.fromEntries((clients || []).map((c) => [c.id, c]));
      }
    }

    const formatted = jobs.map((j) => formatJobRow(j, clientMap));

    return jsonResponse({
      jobs: formatted,
      total,
      page,
      limit,
    });
  } catch (e) {
    console.error('get-admin-commercial-jobs error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/get-admin-commercial-jobs' };
