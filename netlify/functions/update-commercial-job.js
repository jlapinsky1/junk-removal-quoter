import {
  getServiceClient, verifyAdmin,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

const ALLOWED_STATUSES = ['pending_review', 'quote_sent', 'awaiting_payment', 'scheduled', 'in_progress', 'completed', 'cancelled'];

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const { jobId, status, scheduledDate, adminNotes } = await req.json();
    if (!jobId) return errorResponse('jobId is required');

    const updates = {};

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) return errorResponse('Invalid status');
      updates.status = status;
    }

    if (scheduledDate !== undefined) {
      updates.scheduled_date = scheduledDate ? new Date(scheduledDate).toISOString() : null;
    }

    if (adminNotes !== undefined) {
      updates.admin_notes = adminNotes;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No fields to update');
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('update-commercial-job error:', error);
      return errorResponse('Failed to update job', 500);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('update-commercial-job error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/update-commercial-job' };
