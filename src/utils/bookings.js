const BOOKINGS_KEY = 'junkremoval_bookings';

export function getBookings() {
  try {
    const stored = localStorage.getItem(BOOKINGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load bookings:', e);
    return [];
  }
}

export function getBookingById(id) {
  return getBookings().find(b => b.id === id) || null;
}

export function saveBooking(booking) {
  const bookings = getBookings();
  const id = crypto.randomUUID();
  const newBooking = {
    ...booking,
    id,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    approvedAt: null,
    acceptedAt: null,
    approvedQuote: null,
    quoteExpiresAt: null,
    scheduledPickup: null,
    internalNotes: '',
  };
  bookings.unshift(newBooking);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  return id;
}

export function updateBooking(id, updates) {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return false;
  bookings[index] = { ...bookings[index], ...updates };
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  return true;
}

export function approveBooking(id, { approvedQuote, quoteExpiresAt, availableSlots }) {
  return updateBooking(id, {
    status: 'quote_sent',
    approvedQuote,
    quoteExpiresAt,
    availableSlots: availableSlots || [],
    approvedAt: new Date().toISOString(),
  });
}

export function acceptQuote(id, { scheduledPickup }) {
  return updateBooking(id, {
    status: 'scheduled',
    scheduledPickup,
    acceptedAt: new Date().toISOString(),
  });
}

export function deleteBooking(id) {
  const bookings = getBookings().filter(b => b.id !== id);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export const STATUS_LABELS = {
  pending_review: 'Pending Review',
  quote_sent: 'Quote Sent',
  scheduled: 'Scheduled',
  completed: 'Completed',
  declined: 'Declined',
};

export const STATUS_COLORS = {
  pending_review: 'bg-amber-100 text-amber-800',
  quote_sent: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  declined: 'bg-red-100 text-red-800',
};
