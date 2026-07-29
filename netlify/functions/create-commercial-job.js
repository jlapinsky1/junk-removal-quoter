import {
  getServiceClient, verifyCommercialClient,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const clientAuth = await verifyCommercialClient(req);
    if (!clientAuth) return errorResponse('Unauthorized', 401);
    const { user, client } = clientAuth;

    const {
      propertyId, unit, description, preferredDate,
      accessNotes, photoPaths,
    } = await req.json();

    if (!propertyId) return errorResponse('propertyId is required');

    const supabase = getServiceClient();

    // Verify property belongs to this client
    const { data: property } = await supabase
      .from('properties')
      .select('id, name, address, primary_contact_email')
      .eq('id', propertyId)
      .eq('client_id', client.id)
      .single();

    if (!property) return errorResponse('Property not found', 404);

    // Create the job
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        property_id: propertyId,
        unit: unit || null,
        description: description || null,
        preferred_date: preferredDate ? new Date(preferredDate).toISOString() : null,
        access_notes: accessNotes || null,
        status: 'pending_review',
      })
      .select('id')
      .single();

    if (jobErr) {
      console.error('create-commercial-job insert error:', jobErr);
      return errorResponse('Failed to create job', 500);
    }

    // Link submission photos
    const paths = Array.isArray(photoPaths) ? photoPaths : [];
    if (paths.length > 0) {
      const photoRecords = paths.map((path, i) => ({
        job_id: job.id,
        kind: 'submission',
        storage_path: path,
        caption: null,
      }));
      const { error: photoErr } = await supabase
        .from('job_photos')
        .insert(photoRecords);
      if (photoErr) console.error('Photo link error:', photoErr);
    }

    // --- Emails (both awaited so they complete before function exits) ---
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@squatterz.com';
    const siteUrl = process.env.URL || '';

    // Get client email from auth
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
    const clientEmail = authUser?.email;

    const shortId = `#${job.id.slice(0, 8).toUpperCase()}`;

    if (resendKey) {
      const emailPromises = [];

      // Admin notification
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        emailPromises.push(
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `Squatterz <${fromEmail}>`,
              to: [adminEmail],
              subject: `New commercial job request ${shortId} — ${property.name}`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;padding:24px;">
                  <h2>New Commercial Job Request</h2>
                  <p><strong>Job:</strong> ${shortId}</p>
                  <p><strong>Client:</strong> ${client.company_name || client.contact_name || 'Unknown'}</p>
                  <p><strong>Property:</strong> ${property.name} — ${property.address}</p>
                  ${unit ? `<p><strong>Unit:</strong> ${unit}</p>` : ''}
                  ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
                  ${preferredDate ? `<p><strong>Preferred Date:</strong> ${new Date(preferredDate).toLocaleDateString()}</p>` : ''}
                  ${paths.length > 0 ? `<p><strong>Photos:</strong> ${paths.length} submitted</p>` : ''}
                  <p><a href="${siteUrl}/admin/commercial">Review in Admin →</a></p>
                </div>
              `,
            }),
          }).catch(e => console.error('Admin email failed:', e.message))
        );
      }

      // Client confirmation
      if (clientEmail) {
        emailPromises.push(
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `Squatterz <${fromEmail}>`,
              to: [clientEmail],
              subject: `Request received — ${shortId}`,
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0f0d;color:#fff;border-radius:12px;">
                  <div style="text-align:center;margin-bottom:24px;">
                    <span style="font-size:20px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;">SQUATTERZ</span>
                    <div style="color:#22c55e;font-size:10px;letter-spacing:0.2em;font-weight:600;text-transform:uppercase;margin-top:4px;">Commercial Services</div>
                  </div>
                  <h1 style="font-size:20px;font-weight:900;margin:0 0 12px;text-align:center;">Request received!</h1>
                  <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
                    Hi ${client.contact_name ? client.contact_name.split(' ')[0] : 'there'},<br><br>
                    We've got your work order for <strong style="color:#fff;">${property.name}</strong>${unit ? ` (Unit ${unit})` : ''}.
                    We'll review it and send you an estimate within one business day.
                  </p>
                  <div style="background:#111;border:1px solid #222;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                      <span style="color:rgba(255,255,255,0.4);font-size:13px;">Reference</span>
                      <span style="color:#22c55e;font-family:monospace;font-weight:700;font-size:13px;">${shortId}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                      <span style="color:rgba(255,255,255,0.4);font-size:13px;">Status</span>
                      <span style="color:#fff;font-size:13px;font-weight:600;">Under review</span>
                    </div>
                  </div>
                  <p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;">
                    You can track this request in your <a href="${siteUrl}/portal" style="color:#22c55e;">client portal</a>.
                  </p>
                </div>
              `,
            }),
          }).catch(e => console.error('Client confirmation email failed:', e.message))
        );
      }

      await Promise.all(emailPromises);
    }

    return jsonResponse({ jobId: job.id }, 201);
  } catch (e) {
    console.error('create-commercial-job error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/create-commercial-job' };
