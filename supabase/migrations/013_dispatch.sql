-- ============================================================
-- Migration 013: Dispatch interface
-- ============================================================
-- Adds:
--   - en_route, arrived booking statuses
--   - Dispatch operation timestamps on bookings
--   - job_issues table (field issue reporting)
--   - notification_events table (Twilio-ready outbox)
--   - DB trigger to atomically queue notifications on status change
--   - booking_photos: source, captured_at, job_issue_id columns
--   - booking_photos.kind extended to include 'issue'
--   - audit_log event types for dispatch operations


-- ── 1. Extend booking status constraint ─────────────────────────────────────

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in (
    'pending_review', 'quote_sent', 'awaiting_deposit',
    'scheduled', 'en_route', 'arrived', 'in_progress', 'completed',
    'canceled', 'declined'
  ));


-- ── 2. Dispatch timestamp columns on bookings ────────────────────────────────

alter table bookings
  add column if not exists en_route_at  timestamptz,
  add column if not exists arrived_at   timestamptz,
  add column if not exists started_at   timestamptz;


-- ── 3. job_issues table ──────────────────────────────────────────────────────

create table if not exists job_issues (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references bookings(id) on delete cascade,
  issue_type         text not null check (issue_type in (
                       'customer_unavailable', 'cannot_access_property', 'scope_differs',
                       'prohibited_material', 'customer_canceled', 'equipment_issue', 'other'
                     )),
  notes              text not null,
  flagged_for_review boolean not null default true,
  created_at         timestamptz not null default now()
);

create index if not exists idx_job_issues_booking on job_issues(booking_id);
create index if not exists idx_job_issues_created on job_issues(created_at desc);

-- RLS: admin-only
alter table job_issues enable row level security;

create policy "admin_read_job_issues" on job_issues
  for select to authenticated using (is_admin());

create policy "admin_insert_job_issues" on job_issues
  for insert to authenticated with check (is_admin());


-- ── 4. notification_events table ─────────────────────────────────────────────

create table if not exists notification_events (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references bookings(id) on delete cascade,
  event_type    text not null check (event_type in (
                  'crew_en_route', 'crew_arrived', 'job_started',
                  'job_completed', 'final_payment_requested'
                )),
  channel       text not null default 'sms',
  destination   text,
  payload       jsonb,
  status        text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  error_message text
);

create index if not exists idx_notification_events_booking on notification_events(booking_id);
create index if not exists idx_notification_events_status  on notification_events(status) where status = 'queued';

-- RLS: service role only (no direct client access)
alter table notification_events enable row level security;

create policy "admin_read_notification_events" on notification_events
  for select to authenticated using (is_admin());


-- ── 5. DB trigger: atomically queue notification on status change ─────────────
--
-- Fires AFTER UPDATE OF status ON bookings, in the same transaction.
-- Wraps the insert in EXCEPTION WHEN OTHERS so a notification-table failure
-- raises a WARNING but never rolls back the status change.

create or replace function queue_dispatch_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_event_type text;
begin
  -- Map booking status to notification event type
  v_event_type := case new.status
    when 'en_route'    then 'crew_en_route'
    when 'arrived'     then 'crew_arrived'
    when 'in_progress' then 'job_started'
    when 'completed'   then 'job_completed'
    else null
  end;

  -- Skip if no notification needed or status did not actually change
  if v_event_type is null or old.status = new.status then
    return new;
  end if;

  begin
    insert into notification_events (booking_id, event_type, destination, payload)
    values (
      new.id,
      v_event_type,
      new.customer_phone,
      jsonb_build_object(
        'customerName', new.customer_name,
        'bookingId',    new.id,
        'status',       new.status
      )
    );
  exception when others then
    raise warning 'queue_dispatch_notification: could not queue % for booking %: %',
      v_event_type, new.id, sqlerrm;
  end;

  return new;
end;
$$;

create trigger trg_queue_dispatch_notification
  after update of status on bookings
  for each row
  execute function queue_dispatch_notification();


-- ── 6. Extend booking_photos ─────────────────────────────────────────────────
--
-- kind: add 'issue' for field-issue documentation photos
-- source: distinguish customer-uploaded from crew-captured photos
-- captured_at: device capture timestamp
-- job_issue_id: link issue photos to their job_issues row

-- Drop old kind constraint and recreate with 'issue' included
alter table booking_photos drop constraint if exists booking_photos_kind_check;
alter table booking_photos
  add constraint booking_photos_kind_check
  check (kind in ('before', 'after', 'issue'));

alter table booking_photos
  add column if not exists source       text not null default 'customer'
    check (source in ('customer', 'crew')),
  add column if not exists captured_at  timestamptz,
  add column if not exists job_issue_id uuid references job_issues(id) on delete set null;

create index if not exists idx_booking_photos_source
  on booking_photos(booking_id, source, kind);

create index if not exists idx_booking_photos_issue
  on booking_photos(job_issue_id) where job_issue_id is not null;

comment on column booking_photos.kind is
  'before = pre-job photo; after = post-job completion photo; issue = field issue documentation';

comment on column booking_photos.source is
  'customer = uploaded by customer at booking time; crew = captured on-site by technician';

comment on column booking_photos.job_issue_id is
  'Set only for kind=issue photos; links to the job_issues row they document';


-- ── 7. Extend audit_log event types ──────────────────────────────────────────

alter table audit_log drop constraint if exists audit_log_event_type_check;
alter table audit_log add constraint audit_log_event_type_check
  check (event_type in (
    -- original
    'booking_created', 'quote_approved', 'price_override', 'blocker_override',
    'quote_revised', 'quote_accepted', 'slot_reserved', 'slot_canceled',
    'booking_completed', 'booking_declined', 'status_changed', 'token_revoked',
    -- payment (migration 009)
    'deposit_initiated', 'deposit_confirmed', 'deposit_failed',
    'final_payment_requested', 'final_payment_confirmed',
    'dispatch_override', 'invoice_adjusted', 'stripe_reconciled', 'invoice_voided',
    -- support (migration 012)
    'support_note_added',
    -- dispatch (migration 013)
    'crew_dispatched', 'crew_arrived', 'job_started', 'issue_reported'
  ));
