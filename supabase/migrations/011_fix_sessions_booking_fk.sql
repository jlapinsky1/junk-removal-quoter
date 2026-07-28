-- Fix: allow bookings to be deleted without being blocked by upload_sessions.consumed_by_booking
-- Change the FK to ON DELETE SET NULL so deleting a booking clears the reference automatically.

ALTER TABLE upload_sessions
  DROP CONSTRAINT fk_sessions_booking;

ALTER TABLE upload_sessions
  ADD CONSTRAINT fk_sessions_booking
  FOREIGN KEY (consumed_by_booking) REFERENCES bookings(id) ON DELETE SET NULL;
