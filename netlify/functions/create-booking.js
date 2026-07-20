import {
  getServiceClient, getClientIp, checkRateLimit,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const body = await req.json();
    const ip = getClientIp(req);
    const supabase = getServiceClient();

    // Rate limit: 20 bookings per IP per hour
    const allowed = await checkRateLimit(supabase, ip, 'create-booking', 3600, 20);
    if (!allowed) {
      return errorResponse('Too many submissions. Please wait.', 429);
    }

    // Validate required fields
    const { sessionId, idempotencyKey, customerName, customerPhone, address, city, zip, fullAddress } = body;
    if (!sessionId || !idempotencyKey || !customerName || !customerPhone || !address || !city || !zip || !fullAddress) {
      return errorResponse('Missing required fields');
    }

    // Idempotency: return existing booking if key already used
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ bookingId: existing.id, idempotent: true });
    }

    // Atomically consume upload session (conditional update returns 0 rows if already consumed)
    const { data: consumed, error: consumeErr } = await supabase
      .from('upload_sessions')
      .update({ status: 'consumed' })
      .eq('id', sessionId)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (consumeErr || !consumed) {
      return errorResponse('Upload session is invalid, already used, or expired');
    }

    // Check expiration (status was active, but may have passed expiry)
    const { data: session } = await supabase
      .from('upload_sessions')
      .select('expires_at')
      .eq('id', sessionId)
      .single();

    if (session && new Date(session.expires_at) < new Date()) {
      // Roll back consumption
      await supabase.from('upload_sessions').update({ status: 'expired' }).eq('id', sessionId);
      return errorResponse('Upload session has expired. Please start over.');
    }

    // Get photos from session
    const { data: sessionPhotos } = await supabase
      .from('session_photos')
      .select('storage_path, file_name, content_type, size_bytes, sort_order')
      .eq('session_id', sessionId)
      .order('sort_order');

    // Create booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: body.customerEmail || null,
        address,
        city,
        state: body.state || null,
        zip,
        full_address: fullAddress,
        quantity: body.quantity || null,
        access_type: body.accessType || null,
        stairs: body.stairs || null,
        elevator: body.elevator || null,
        description: body.description || null,
        detected_items: body.detectedItems || [],
        ai_detected_items: body.aiDetectedItems || [],
        photo_count: sessionPhotos?.length || 0,
        preferred_date: body.preferredDate || null,
        second_choice_date: body.secondChoiceDate || null,
        time_preference: body.timePreference || null,
        upload_session_id: sessionId,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (bookingErr) {
      console.error('Booking creation error:', bookingErr);
      // If idempotency_key unique constraint violation, fetch existing
      if (bookingErr.code === '23505' && bookingErr.message?.includes('idempotency_key')) {
        const { data: retry } = await supabase
          .from('bookings')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .single();
        if (retry) return jsonResponse({ bookingId: retry.id, idempotent: true });
      }
      return errorResponse('Failed to create booking', 500);
    }

    // Link session photos to booking
    if (sessionPhotos?.length > 0) {
      const photoRecords = sessionPhotos.map(p => ({
        booking_id: booking.id,
        storage_path: p.storage_path,
        file_name: p.file_name,
        content_type: p.content_type,
        size_bytes: p.size_bytes,
        sort_order: p.sort_order,
      }));

      const { error: linkErr } = await supabase
        .from('booking_photos')
        .insert(photoRecords);

      if (linkErr) {
        console.error('Photo linking error:', linkErr);
      }
    }

    // Set consumed_by_booking reference
    await supabase
      .from('upload_sessions')
      .update({ consumed_by_booking: booking.id })
      .eq('id', sessionId);

    // Audit log
    await supabase.from('audit_log').insert({
      booking_id: booking.id,
      event_type: 'booking_created',
      metadata: {
        ip_address: ip,
        session_id: sessionId,
        photo_count: sessionPhotos?.length || 0,
      },
    });

    return jsonResponse({ bookingId: booking.id }, 201);
  } catch (e) {
    console.error('create-booking error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/create-booking' };
