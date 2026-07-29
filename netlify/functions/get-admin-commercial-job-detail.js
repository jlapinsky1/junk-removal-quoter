import {
  getServiceClient, verifyAdmin,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';
import { getStripeClient } from './_shared/stripe.js';

export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    if (!jobId) return errorResponse('jobId is required');

    const supabase = getServiceClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        properties!inner(
          id, name, address, notes,
          primary_contact_name, primary_contact_phone, primary_contact_email,
          commercial_clients!inner(id, company_name, contact_name, phone, user_id)
        ),
        job_photos(id, kind, storage_path, caption, created_at)
      `)
      .eq('id', jobId)
      .single();

    if (error || !job) return errorResponse('Job not found', 404);

    // Get client email from auth
    const clientUserId = job.properties.commercial_clients.user_id;
    let clientEmail = null;
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(clientUserId);
      clientEmail = user?.email || null;
    } catch (e) {
      console.error('Failed to fetch client email:', e.message);
    }

    // Build public photo URLs (job-photos bucket is public)
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const photos = (job.job_photos || []).map(p => ({
      id: p.id,
      kind: p.kind,
      url: `${supabaseUrl}/storage/v1/object/public/job-photos/${p.storage_path}`,
      caption: p.caption,
      createdAt: p.created_at,
    }));

    // Stripe payment summary if invoice exists
    let paymentSummary = null;
    if (job.stripe_invoice_id) {
      try {
        const stripe = getStripeClient();
        const invoice = await stripe.invoices.retrieve(job.stripe_invoice_id);
        paymentSummary = {
          invoiceTotalCents: invoice.amount_due,
          amountPaidCents: invoice.amount_paid,
          amountRemainingCents: invoice.amount_remaining,
          invoiceStatus: invoice.status,
          invoicePdfUrl: invoice.invoice_pdf,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
        };
      } catch (e) {
        console.error('Failed to fetch Stripe invoice:', e.message);
      }
    }

    return jsonResponse({
      id: job.id,
      status: job.status,
      unit: job.unit,
      description: job.description,
      preferredDate: job.preferred_date,
      accessNotes: job.access_notes,
      scheduledDate: job.scheduled_date,
      completedAt: job.completed_at,
      itemsRemoved: job.items_removed,
      completionNotes: job.completion_notes,
      estimate: job.estimate,
      finalAmount: job.final_amount,
      adminNotes: job.admin_notes,
      createdAt: job.created_at,
      quoteSentAt: job.quote_sent_at,
      depositConfirmedAt: job.deposit_confirmed_at,
      financiallyCompletedAt: job.financially_completed_at,
      stripeInvoiceId: job.stripe_invoice_id,
      property: {
        id: job.properties.id,
        name: job.properties.name,
        address: job.properties.address,
        notes: job.properties.notes,
        primaryContactName: job.properties.primary_contact_name,
        primaryContactPhone: job.properties.primary_contact_phone,
        primaryContactEmail: job.properties.primary_contact_email,
      },
      client: {
        id: job.properties.commercial_clients.id,
        companyName: job.properties.commercial_clients.company_name,
        contactName: job.properties.commercial_clients.contact_name,
        phone: job.properties.commercial_clients.phone,
        email: clientEmail,
      },
      photos,
      paymentSummary,
    });
  } catch (e) {
    console.error('get-admin-commercial-job-detail error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/get-admin-commercial-job-detail' };
