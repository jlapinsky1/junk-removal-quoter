import {
  getServiceClient, verifyAdmin, jsonResponse, errorResponse,
} from './_shared/supabase.js';

// Allowed MIME types for completion photos
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]);

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return errorResponse('Unauthorized', 401);

    const { bookingId, fileName, contentType } = await req.json();

    if (!bookingId) return errorResponse('bookingId is required');
    if (!fileName) return errorResponse('fileName is required');
    if (!contentType || !ALLOWED_TYPES.has(contentType.toLowerCase())) {
      return errorResponse('contentType must be a supported image format (JPEG, PNG, WebP, HEIC)');
    }

    const supabase = getServiceClient();

    // Verify booking exists and is in a completable status
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) return errorResponse('Booking not found', 404);
    if (!['scheduled', 'in_progress'].includes(booking.status)) {
      return errorResponse(
        `Cannot upload completion photos for a booking in '${booking.status}' status`
      );
    }

    // Generate a unique storage path scoped to this booking
    // Stored under completions/ prefix to distinguish from customer-submitted photos
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const uuid = crypto.randomUUID();
    const storagePath = `completions/${bookingId}/${uuid}.${ext}`;

    // Create signed upload URL (valid for 10 minutes)
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('booking-photos')
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (uploadErr || !uploadData?.signedUrl) {
      console.error('Failed to create signed upload URL:', uploadErr);
      return errorResponse('Failed to create upload URL', 500);
    }

    return jsonResponse({
      signedUploadUrl: uploadData.signedUrl,
      storagePath,
    });

  } catch (e) {
    console.error('get-completion-photo-url error:', e);
    return errorResponse('Server error', 500);
  }
}

export const config = { path: '/api/get-completion-photo-url' };
