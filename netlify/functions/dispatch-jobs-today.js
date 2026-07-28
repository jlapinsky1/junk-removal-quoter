/**
 * GET /api/dispatch-jobs-today
 *
 * Returns all jobs scheduled for today (in business timezone) plus the
 * id of the next non-completed job.  Sorted chronologically by
 * scheduled_pickup.  Returns only the dispatch-safe DTO — no pricing,
 * Stripe IDs, risk scores, or financial data.
 */

import { getServiceClient, verifyAdmin, jsonResponse, errorResponse } from './_shared/supabase.js';

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'America/New_York';

/** Compute today's date string (YYYY-MM-DD) in the business timezone. */
function getLocalDateString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE }).format(new Date());
}

/** Convert a booking row (snake_case) into a dispatch-safe DTO (camelCase). */
function toDispatchDTO(b) {
  return {
    id:                 b.id,
    bookingRef:         'RES-' + b.id.slice(0, 8).toUpperCase(),
    status:             b.status,
    depositConfirmed:   b.deposit_confirmed_at != null,
    appointmentDate:    b.preferred_date ?? null,
    appointmentWindow:  b.time_preference ?? null,
    scheduledPickup:    b.scheduled_pickup ?? null,
    customerName:       b.customer_name ?? null,
    customerPhone:      b.customer_phone ?? null,
    fullAddress:        b.full_address ?? null,
    accessInstructions: b.access_type ?? null,
    quantity:           b.quantity ?? null,
    accessType:         b.access_type ?? null,
    stairs:             b.stairs ?? null,
    elevator:           b.elevator ?? null,
    description:        b.description ?? null,
    internalJobNotes:   b.internal_notes ?? null,
    enRouteAt:          b.en_route_at ?? null,
    arrivedAt:          b.arrived_at ?? null,
    startedAt:          b.started_at ?? null,
    completedAt:        b.completed_at ?? null,
  };
}

export default async function handler(req) {
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const todayStr = getLocalDateString(); // e.g. "2026-07-28"

    const supabase = getServiceClient();

    // Fetch bookings with a scheduled_pickup on today's date.
    // scheduled_pickup is a text field storing the appointment window string.
    // preferred_date is a date column for the actual date.
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(
        'id, status, deposit_confirmed_at, preferred_date, time_preference, ' +
        'scheduled_pickup, customer_name, customer_phone, full_address, ' +
        'access_type, quantity, stairs, elevator, description, internal_notes, ' +
        'en_route_at, arrived_at, started_at, completed_at'
      )
      .in('status', ['scheduled', 'en_route', 'arrived', 'in_progress', 'completed'])
      .eq('preferred_date', todayStr)
      .order('scheduled_pickup', { ascending: true });

    if (error) {
      console.error('dispatch-jobs-today: DB error:', error);
      return errorResponse('Failed to load jobs', 500);
    }

    const jobs = (bookings || []).map(toDispatchDTO);

    // Sort chronologically by the start time of the appointment window.
    // The DB ORDER BY handles this in production; this ensures correct order
    // even when the text sort doesn't match chronological order (e.g. AM/PM).
    function parseStartMinutes(pickup) {
      if (!pickup) return 0;
      const m = pickup.match(/^(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return 0;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
      if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    }
    jobs.sort((a, b) => parseStartMinutes(a.scheduledPickup) - parseStartMinutes(b.scheduledPickup));

    // Next job = first non-completed job in chronological order
    const nextJob = jobs.find(j => j.status !== 'completed');
    const nextJobId = nextJob?.id ?? null;

    return jsonResponse({ jobs, nextJobId, date: todayStr });

  } catch (e) {
    console.error('dispatch-jobs-today error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/dispatch-jobs-today' };
