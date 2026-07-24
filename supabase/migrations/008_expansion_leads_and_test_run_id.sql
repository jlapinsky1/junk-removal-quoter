-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: expansion_leads table + test_run_id column on bookings
-- ─────────────────────────────────────────────────────────────────────────────

-- ── expansion_leads ───────────────────────────────────────────────────────────
-- Stores out-of-zone service-expansion interest leads from the booking flow.

create table if not exists expansion_leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  zip         text,
  ip_address  text,
  test_run_id text,  -- populated only in test environments for scoped cleanup
  created_at  timestamptz not null default now()
);

-- Admins can read leads; service role writes them (no RLS insert policy needed
-- because notify-expansion uses the service-role key).
alter table expansion_leads enable row level security;

create policy "Admins can read expansion leads"
  on expansion_leads for select
  using (is_admin());

-- Index for test cleanup queries
create index if not exists idx_expansion_leads_test_run_id
  on expansion_leads (test_run_id)
  where test_run_id is not null;

create index if not exists idx_expansion_leads_email
  on expansion_leads (email);

-- ── test_run_id column on bookings ────────────────────────────────────────────
-- Populated only by test suites; null in production.
-- Allows the test-lookup endpoint to scope queries and cleanups to a specific run.

alter table bookings
  add column if not exists test_run_id text;

create index if not exists idx_bookings_test_run_id
  on bookings (test_run_id)
  where test_run_id is not null;
