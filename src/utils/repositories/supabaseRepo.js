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
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
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
