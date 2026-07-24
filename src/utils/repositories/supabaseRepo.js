/**
 * Supabase repository — production mode.
 *
 * Admin operations use the authenticated Supabase client (RLS-protected).
 * Customer operations call Netlify functions (which use the service role key).
 */

import { supabase } from '../supabaseClient';

async function adminFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

const supabaseRepo = {
  mode: 'supabase',

  // ── Auth ──
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  },

  // ── Admin reads (direct Supabase, RLS-protected) ──
  async getBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getBookingById(id) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getSnapshotsForBooking(bookingId) {
    const { data, error } = await supabase
      .from('quote_snapshots')
      .select('*')
      .eq('booking_id', bookingId)
      .order('version', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getAcceptanceForBooking(bookingId) {
    const { data, error } = await supabase
      .from('quote_acceptances')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getReservationsForBooking(bookingId) {
    const { data, error } = await supabase
      .from('slot_reservations')
      .select('*')
      .eq('booking_id', bookingId)
      .order('reserved_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ── Upload session (customer, via Netlify functions) ──
  async createUploadSession(turnstileToken) {
    const res = await fetch('/api/create-upload-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnstileToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to create upload session');
    }
    return res.json();
  },

  // ── Customer submission (via Netlify function) ──
  async createBooking(bookingData) {
    const res = await fetch('/api/create-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Submission failed');
    }
    return res.json();
  },

  // ── Admin writes (via Netlify functions, auth-protected) ──
  async updateBooking(id, updates) {
    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async approveBooking(id, data) {
    return adminFetch('/api/approve-quote', {
      method: 'POST',
      body: JSON.stringify({ bookingId: id, ...data }),
    });
  },

  async completeBooking(id, actuals) {
    return adminFetch('/api/complete-job', {
      method: 'POST',
      body: JSON.stringify({ bookingId: id, actuals }),
    });
  },

  async deleteBooking(id) {
    const { error } = await supabase.rpc('admin_delete_booking', { p_booking_id: id });
    if (error) throw error;
  },

  // ── Customer quote (via Netlify function, token-protected) ──
  async getCustomerQuote(token) {
    const res = await fetch(`/api/get-customer-quote?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    return res.json();
  },

  // ── Customer acceptance (via Netlify function, token-protected) ──
  async acceptQuote(token, data) {
    const res = await fetch('/api/accept-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...data }),
    });
    return res.json();
  },

  // ── Slots (admin reads from DB) ──
  async getBookedSlots() {
    const { data, error } = await supabase
      .from('slot_reservations')
      .select('resource_id, pickup_date, start_time, end_time, status')
      .in('status', ['reserved', 'confirmed']);
    if (error) throw error;
    return data;
  },

  async isSlotBooked(resourceId, pickupDate, startTime) {
    const { count, error } = await supabase
      .from('slot_reservations')
      .select('id', { count: 'exact', head: true })
      .eq('resource_id', resourceId || 'truck-1')
      .eq('pickup_date', pickupDate)
      .eq('start_time', startTime)
      .in('status', ['reserved', 'confirmed']);
    if (error) throw error;
    return count > 0;
  },

  // ── Photos ──
  async getUploadUrl(sessionId, fileName, contentType) {
    const res = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, fileName, contentType }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to get upload URL');
    }
    return res.json();
  },

  async getPhotoUrls(bookingId) {
    const { data, error } = await supabase
      .from('booking_photos')
      .select('storage_path, file_name, sort_order')
      .eq('booking_id', bookingId)
      .order('sort_order');
    if (error) throw error;

    return Promise.all(data.map(async (photo) => {
      const { data: urlData } = await supabase.storage
        .from('booking-photos')
        .createSignedUrl(photo.storage_path, 3600);
      return {
        url: urlData?.signedUrl || '',
        path: photo.storage_path,
        name: photo.file_name,
      };
    }));
  },

  // ── Business Goals ──
  async getActiveGoal(goalType = 'cash_profit') {
    const { data, error } = await supabase
      .from('business_goals')
      .select('*')
      .eq('goal_type', goalType)
      .eq('active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertGoal(goalData) {
    // Deactivate existing active goal of same type first
    if (goalData.active !== false) {
      await supabase
        .from('business_goals')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('goal_type', goalData.goal_type)
        .eq('active', true);
    }
    const { data, error } = await supabase
      .from('business_goals')
      .upsert(goalData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveGoalSnapshot(snapshot) {
    const { error } = await supabase
      .from('goal_snapshots')
      .upsert(snapshot, { onConflict: 'goal_id,snapshot_date' });
    if (error) throw error;
  },

  async getCompletedBookingsInRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, approved_quote, actuals, internal_estimate, completed_at, status')
      .eq('status', 'completed')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate + 'T23:59:59Z');
    if (error) throw error;
    return data || [];
  },

  async getActiveBookingsByStatus(statuses) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, approved_quote, internal_estimate, created_at')
      .in('status', statuses)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getScheduledBookingsForDateRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('slot_reservations')
      .select(`
        booking_id, pickup_date, start_time, end_time, resource_id, status,
        bookings:booking_id (id, status, approved_quote, internal_estimate, actuals, full_address, quantity, access_type, completed_at)
      `)
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate)
      .in('status', ['reserved', 'confirmed', 'completed']);
    if (error) throw error;
    return data || [];
  },

  // ── Calibration ──
  async getCalibrationRecords(status = null) {
    let query = supabase
      .from('calibration_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('owner_decision', status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async upsertCalibrationRecord(record) {
    const { data, error } = await supabase
      .from('calibration_records')
      .upsert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Location / Travel Cache ──
  async getLocationCache(addressHash) {
    const { data, error } = await supabase
      .from('location_cache')
      .select('*')
      .eq('address_hash', addressHash)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertLocationCache(entry) {
    const { error } = await supabase
      .from('location_cache')
      .upsert(entry, { onConflict: 'address_hash' });
    if (error) throw error;
  },

  async getTravelCache(originHash, destinationHash) {
    const { data, error } = await supabase
      .from('travel_cache')
      .select('*')
      .eq('origin_hash', originHash)
      .eq('destination_hash', destinationHash)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertTravelCache(entry) {
    const { error } = await supabase
      .from('travel_cache')
      .upsert(entry, { onConflict: 'origin_hash,destination_hash' });
    if (error) throw error;
  },

  // ── Audit (admin reads) ──
  async getAuditLog(bookingId) {
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });
    if (bookingId) query = query.eq('booking_id', bookingId);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return data;
  },

  async appendAuditEntry(entry) {
    const { error } = await supabase.from('audit_log').insert(entry);
    if (error) throw error;
  },
};

export default supabaseRepo;
