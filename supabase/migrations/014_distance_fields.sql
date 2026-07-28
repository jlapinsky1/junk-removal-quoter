-- Add computed distance/travel fields to bookings
-- Populated by the geocode-booking Netlify function via Nominatim

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS distance_miles    NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS travel_minutes_one_way INTEGER;
