import {
  getServiceClient, verifyAdmin,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

/**
 * GET /api/get-admin-completion-detail?bookingId=...
 *
 * Admin-only. Returns full detail for a completed booking in one call:
 * - Booking + completion package
 * - Before/after photos with signed URLs (1 hour)
 * - Audit log timeline
 * - Support notes
 */
export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const url = new URL(req.url, 'http://localhost');
    const bookingId = url.searchParams.get('bookingId');
    if (!bookingId) return errorResponse('bookingId is required');

    const supabase = getServiceClient();

    // ── Booking + completion ────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id, status,
        customer_name, customer_phone, customer_email,
        full_address, address, city, state, zip,
        approved_quote, quote_version,
        completed_at, deposit_confirmed_at, financially_completed_at,
        stripe_customer_id, stripe_invoice_id,
        stripe_deposit_payment_intent_id, stripe_final_payment_intent_id,
        internal_estimate, actuals, created_at, updated_at,
        booking_completions (
          id, completed_at, technician_name, items_removed,
          volume_estimate, completion_notes, disposal_notes,
          final_amount_cents, price_adjustment_reason, created_at
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) return errorResponse('Booking not found', 404);

    // ── Photos with signed URLs ─────────────────────────────────────────────
    const { data: photoRows } = await supabase
      .from('booking_photos')
      .select('id, storage_path, file_name, kind, sort_order')
      .eq('booking_id', bookingId)
      .order('kind')
      .order('sort_order');

    const photos = photoRows || [];

    async function signUrl(storagePath) {
      if (!storagePath) return null;
      const { data } = await supabase.storage
        .from('booking-photos')
        .createSignedUrl(storagePath, 3600);
      return data?.signedUrl || null;
    }

    const photosWithUrls = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        kind: p.kind,
        fileName: p.file_name,
        sortOrder: p.sort_order,
        signedUrl: await signUrl(p.storage_path),
      }))
    );

    // ── Audit log (timeline) ────────────────────────────────────────────────
    const { data: auditRows } = await supabase
      .from('audit_log')
      .select('id, event_type, admin_id, metadata, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    // ── Support notes ───────────────────────────────────────────────────────
    const { data: noteRows } = await supabase
      .from('support_notes')
      .select('id, note_text, admin_email, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    const completion = Array.isArray(booking.booking_completions)
      ? booking.booking_completions[0] ?? null
      : booking.booking_completions ?? null;

    return jsonResponse({
      booking: {
        id: booking.id,
        bookingRef: `RES-${booking.id.slice(0, 8).toUpperCase()}`,
        status: booking.status,
        customerName: booking.customer_name || null,
        customerPhone: booking.customer_phone || null,
        customerEmail: booking.customer_email || null,
        fullAddress: booking.full_address || null,
        approvedQuote: booking.approved_quote ? Number(booking.approved_quote) : null,
        completedAt: booking.completed_at || null,
        depositConfirmedAt: booking.deposit_confirmed_at || null,
        financiallyCompletedAt: booking.financially_completed_at || null,
        stripeCustomerId: booking.stripe_customer_id || null,
        stripeInvoiceId: booking.stripe_invoice_id || null,
        stripeFinalPaymentIntentId: booking.stripe_final_payment_intent_id || null,
        internalEstimate: booking.internal_estimate || null,
        actuals: booking.actuals || null,
        createdAt: booking.created_at || null,
      },
      completion: completion ? {
        id: completion.id,
        completedAt: completion.completed_at,
        technicianName: completion.technician_name,
        itemsRemoved: completion.items_removed,
        volumeEstimate: completion.volume_estimate || null,
        completionNotes: completion.completion_notes,
        disposalNotes: completion.disposal_notes || null,
        finalAmountCents: completion.final_amount_cents,
        priceAdjustmentReason: completion.price_adjustment_reason || null,
        createdAt: completion.created_at,
      } : null,
      photos: {
        before: photosWithUrls.filter(p => p.kind === 'before'),
        after: photosWithUrls.filter(p => p.kind === 'after'),
      },
      timeline: (auditRows || []).map(e => ({
        id: e.id,
        eventType: e.event_type,
        adminId: e.admin_id || null,
        metadata: e.metadata || null,
        createdAt: e.created_at,
      })),
      supportNotes: (noteRows || []).map(n => ({
        id: n.id,
        noteText: n.note_text,
        adminEmail: n.admin_email || null,
        createdAt: n.created_at,
      })),
    });

  } catch (e) {
    console.error('get-admin-completion-detail error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/get-admin-completion-detail' };
