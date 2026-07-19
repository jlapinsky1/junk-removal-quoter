import { getServiceClient, verifyAdmin, jsonResponse, errorResponse } from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const { bookingId, actuals } = await req.json();

    if (!bookingId || !actuals) {
      return errorResponse('bookingId and actuals are required');
    }

    // Validate actuals has required field
    if (actuals.finalAmount == null || isNaN(Number(actuals.finalAmount)) || Number(actuals.finalAmount) < 0) {
      return errorResponse('actuals.finalAmount is required and must be a non-negative number');
    }

    const supabase = getServiceClient();

    // Atomic status transition: only update if currently 'scheduled'
    // This prevents TOCTOU race and duplicate completions in one step
    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        actuals,
        completed_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();

    if (updateErr) {
      console.error('Completion update error:', updateErr);
      return errorResponse('Failed to complete booking', 500);
    }

    if (!updated) {
      // Either not found or not in 'scheduled' status
      const { data: booking } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .maybeSingle();

      if (!booking) {
        return errorResponse('Booking not found', 404);
      }
      if (booking.status === 'completed') {
        return errorResponse('This booking has already been completed', 409);
      }
      return errorResponse(`Cannot complete a booking in '${booking.status}' status`);
    }

    // Update slot reservation status
    await supabase
      .from('slot_reservations')
      .update({ status: 'completed' })
      .eq('booking_id', bookingId)
      .in('status', ['reserved', 'confirmed']);

    // Audit log
    await supabase.from('audit_log').insert({
      booking_id: bookingId,
      event_type: 'booking_completed',
      admin_id: admin.id,
      after_value: actuals,
    });

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('complete-job error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/complete-job' };
