# Launch Checklist

## Required Environment Variables

### Netlify (server-side)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Anon key (for admin JWT verification) |
| `ANTHROPIC_API_KEY` | Claude API key for photo analysis |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | Verified sender address (e.g. `jobs@yourdomain.com`) |
| `STRIPE_SECRET_KEY` | Stripe secret key — **never** use a live key locally or in CI |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from `stripe listen` output |
| `SHOP_LAT` | Latitude of shop / home base (enables real travel time via geocoding) |
| `SHOP_LNG` | Longitude of shop / home base (enables real travel time via geocoding) |
| `ADMIN_EMAIL` | Admin notification address — receives email when new commercial job is submitted and when commercial deposits are confirmed |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server secret (optional) |
| `NODE_ENV` | Set to `test` only in test environments — never in production |
| `ENABLE_TEST_ENDPOINTS` | Set to `true` only in test environments — never in production |
| `TEST_LOOKUP_SECRET` | Secret for the test-only lookup endpoint — never in production |

### Vite (client-side, prefixed with `VITE_`)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_...` in prod, `pk_test_...` in dev) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps Distance Matrix (optional) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (optional) |

## Required Supabase Migrations

Run all migrations in `supabase/migrations/` in order against the production database:

| File | What It Creates |
|---|---|
| `001_initial_schema.sql` | Core tables, RLS policies, RPCs, triggers, storage bucket |
| `002_business_goals.sql` | `business_goals`, `goal_snapshots` tables |
| `003_decision_context.sql` | `decision_context JSONB` column on `quote_snapshots` |
| `004_calibration.sql` | `calibration_records` table |
| `005_route_cache.sql` | `location_cache`, `travel_cache`, geocoding columns on `bookings` |
| `006_commercial_portal.sql` | `commercial_clients`, `properties`, `jobs`, `invoices` tables |
| `007_service_area_admin.sql` | Admin service area config schema |
| `008_expansion_leads_and_test_run_id.sql` | `expansion_leads` table; `test_run_id` column on `bookings` |
| `009_stripe_payment.sql` | Stripe columns on `bookings`; `slot_reservations.expires_at`; `payment_access_tokens`; `processed_stripe_events`; `booking_completions`; `booking_photos.kind`; updated audit event types; `initiate_payment_atomic`, `confirm_deposit_atomic`, `cleanup_expired_slot_reservations` |
| `010_fix_approve_quote_atomic.sql` | Recreates `approve_quote_atomic` with `p_decision_context JSONB DEFAULT NULL`; stores it on `quote_snapshots` |
| `011_fix_sessions_booking_fk.sql` | Changes `fk_sessions_booking` to `ON DELETE SET NULL` to allow booking deletion without FK violation |
| `012_support_notes.sql` | `support_notes` table; RLS via `is_admin()` |
| `013_dispatch.sql` | `dispatch_tokens`, `dispatch_events` tables for crew dispatch interface |
| `014_distance_fields.sql` | `distance_miles`, `travel_minutes_one_way` columns on `bookings` |
| `015_commercial_workflow.sql` | Extends `jobs`: expands status enum (adds `pending_review`, `quote_sent`, `awaiting_payment`; migrates `open` → `pending_review`); adds `quote_token_hash`, `stripe_*`, `deposit_confirmed_at`, `financially_completed_at`, `admin_notes`, `quoted_at`, `quote_sent_at`, `quote_expires_at` columns; adds `submission` kind to `job_photos` |

Migration 001 creates:
- 11 tables: `admin_users`, `rate_limits`, `upload_sessions`, `session_photos`, `bookings`, `booking_photos`, `quote_snapshots`, `quote_tokens`, `slot_reservations`, `quote_acceptances`, `audit_log`
- Helper functions: `prevent_mutation()`, `set_updated_at()`, `is_admin()`, `check_rate_limit()`
- Transactional RPCs: `accept_quote_atomic()`, `approve_quote_atomic()`, `cleanup_abandoned_data()`
- Immutability triggers on `quote_snapshots` and `audit_log` (prevent UPDATE/DELETE even from service role)
- Storage bucket `booking-photos` (private)

## Required RLS Policies

All created by the migration. Summary:

| Table | Policy | Access |
|---|---|---|
| `admin_users` | SELECT | `is_admin()` |
| `rate_limits` | — | Service role only |
| `upload_sessions` | — | Service role only |
| `session_photos` | — | Service role only |
| `bookings` | SELECT, UPDATE, DELETE | `is_admin()` |
| `booking_photos` | SELECT | `is_admin()` |
| `quote_snapshots` | SELECT | `is_admin()` |
| `quote_tokens` | SELECT | `is_admin()` |
| `slot_reservations` | SELECT | `is_admin()` |
| `quote_acceptances` | SELECT | `is_admin()` |
| `audit_log` | SELECT | `is_admin()` |
| `booking_completions` | SELECT | `is_admin()` |
| `payment_access_tokens` | SELECT | `is_admin()` |
| `processed_stripe_events` | SELECT | `is_admin()` |

No anonymous or generic authenticated access to any table.

Writes to `booking_completions`, `payment_access_tokens`, and `processed_stripe_events` go through the service role only (no authenticated INSERT policy).

## Required Storage Policies

Created by migration:

- Bucket `booking-photos`: `public = false`
- `admin_read_storage`: SELECT for `authenticated` + `is_admin()` on `bucket_id = 'booking-photos'`
- No INSERT/UPDATE/DELETE policies — uploads happen via signed URLs from the service role
- No anonymous access

## Required Turnstile Configuration

1. Create a site at [Cloudflare Turnstile](https://dash.cloudflare.com/turnstile)
2. Set `VITE_TURNSTILE_SITE_KEY` (client) and `TURNSTILE_SECRET_KEY` (server)
3. Optional: without Turnstile, upload sessions are still rate-limited (5/IP/10min) but lack CAPTCHA protection

## Required Admin User Bootstrap

After running the migration:

```sql
-- 1. Create the admin user in Supabase Auth (Dashboard > Authentication > Users > Add User)
-- 2. Copy the user UUID from the Users table
-- 3. Insert into admin_users:
INSERT INTO admin_users (user_id) VALUES ('paste-user-uuid-here');
```

**Important:** The `admin_users` table has no INSERT policy — you must use the Supabase Dashboard SQL editor (which runs as superuser) or the service role.

## Production Stripe Setup

Before going live with real payments:

1. **Switch to live keys** in Stripe Dashboard (toggle off "Test mode")
2. **Add to Netlify** (Site configuration → Environment variables):
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = (from step 3)
3. **Create production webhook** in Stripe Dashboard → Developers → Webhooks:
   - Endpoint URL: `https://yourdomain.com/api/stripe-webhook`
   - Events: `invoice_payment.paid`, `invoice.paid`, `payment_intent.payment_failed`
   - Copy the signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET` in Netlify
4. **Redeploy** Netlify (env var changes require a redeploy)
5. **Verify** with a real small test transaction before going fully live

> **Note:** `STRIPE_WEBHOOK_SECRET` is different for test vs live endpoints and per-endpoint. Always copy it from the specific webhook endpoint you created.

---

## Manual Smoke-Test Steps

### Customer Flow
1. Open `/` or `/book` — booking wizard should load
2. Complete all 5 steps (Contact, Address, Photos, Details, Schedule)
3. Upload 3+ photos — verify they upload to Supabase Storage
4. Submit — verify confirmation screen with booking reference
5. Check Supabase: `bookings`, `booking_photos`, `upload_sessions` (status=consumed), `audit_log`

### Admin Flow
1. Open `/admin` — login screen should appear
2. Sign in with admin credentials
3. New request should appear in the queue
4. Open the request — verify decision summary, risk flags, breakdown
5. Set a quote price and approve — verify:
   - `quote_snapshots` row created (immutable)
   - `quote_tokens` row created (hash, not raw token)
   - Quote URL displayed with raw token
6. Sign out and sign back in — session persists

### Customer Deposit Flow (requires Stripe test mode + `stripe listen` running)
1. Open the quote URL from step 5 (`/quote/{token}`)
2. Verify only customer-safe fields are shown (no margins, costs, internal notes)
3. Verify the deposit split card: total / deposit due today / remaining after service
4. Check all 3 confirmation boxes, select a time slot
5. Click "Proceed to Payment" — verify Payment Element loads
6. Enter test card `4242 4242 4242 4242`, exp `12/29`, CVC `123`
7. Verify deposit confirmed screen + booking status=`scheduled`, `deposit_confirmed_at` set
8. Verify `slot_reservations` status=`confirmed`, `quote_tokens.used_at` set
9. In admin panel: verify "DEPOSIT CONFIRMED — dispatch allowed" shown
10. Revisit quote URL — should show "You're All Set" (slot confirmed)

### Job Completion
1. In admin, open the scheduled booking
2. Scroll to "Complete Job" section
3. Upload at least one after photo
4. Fill in technician name, items removed, completion notes, final amount, job completed at
5. Click "Complete Job & Request Final Balance"
6. Verify: `booking_completions` row created, booking status=`completed`
7. Verify customer email sent with `/invoice/:token/final` link
8. Open the final page link — verify completion summary, before/after photos (signed URLs), payment element
9. Pay with test card — verify `invoice.paid` webhook → `financially_completed_at` set
10. Try completing the job a second time — should succeed (idempotent, no duplicate DB row)

### Admin Override Flow
1. Approve a booking and force `status=scheduled` without `deposit_confirmed_at` (via Supabase SQL editor)
2. Try "Complete Job" — should be blocked with "deposit not confirmed" error
3. Add `override=true` + `overrideReason` — should succeed
4. Verify `audit_log` contains `dispatch_override` event

### Security Checks
1. Try `/admin` without signing in — should see login form
2. Try accessing Supabase tables with anon key (no admin_users entry) — should get empty results
3. Try an expired quote URL — should show "no longer available"
4. Open browser DevTools on the customer quote page — verify no internal pricing data in network responses

### Concurrency Check
1. Approve a quote with one time slot
2. Open the quote URL in two browser tabs
3. Accept in both tabs simultaneously
4. Exactly one should succeed, the other should show "slot was just taken"

---

## Manual UI Release Checklist

The Python regression suite tests API contracts and database persistence. These UI behaviors must be verified manually before each production release:

**Booking flow:**
- [ ] Hero ZIP entry → service area check → correct step progression
- [ ] Photo upload: camera/file picker opens, preview shows, minimum 3 enforced
- [ ] Date picker: Sundays excluded, 21-day window, backup date ordering correct
- [ ] Out-of-zone ZIP shows warm messaging + "Notify Me" CTA
- [ ] Unavailable ZIP shows correct message (distinct from outside-zone message)
- [ ] Excluded ZIP shows correct message

**Admin dashboard:**
- [ ] Service area admin tab loads, ZIP chips render correctly
- [ ] Decision card shows Take/Review/Pass with correct score and factors
- [ ] Quote approval flow works end-to-end (decision context saved)
- [ ] Stripe payment panel shows in booking detail once approved
- [ ] "DEPOSIT CONFIRMED" / "DEPOSIT REQUIRED" indicator shown correctly
- [ ] Complete Job form: after photo upload, all required fields, submit
- [ ] Goal/pace dashboard reflects current bookings
- [ ] Learning dashboard shows calibration suggestions when data exists

**Payment flow (Stripe test mode):**
- [ ] Quote page shows deposit split (total / 50% deposit / 50% balance)
- [ ] Stripe Payment Element loads (not CardElement)
- [ ] Test card `4242...` → deposit confirmed, booking scheduled
- [ ] Test card `4000 0025 0000 3155` (3DS) → redirect → return → deposit confirmed
- [ ] Declined card `4000 0000 0000 9995` → slot stays reserved, customer can retry
- [ ] `/invoice/:token/final` shows completion summary, before/after photos, Payment Element
- [ ] Final payment → invoice.paid → financially_completed_at set
- [ ] PDF download link works; PDF shows Squatterz branding, job details, work summary, and invoice breakdown (text-only, no embedded photos)

**Commercial portal (client-side):**
- [ ] Portal login → dashboard renders correctly
- [ ] Dashboard shows "Pending Quotes" alert when a quote is in `quote_sent` status
- [ ] New work order form → drag-and-drop photo upload works, submission sends confirmation email to client and notification to `ADMIN_EMAIL`
- [ ] Completion packet PDF opens correctly in browser
- [ ] Client cannot access another client's data (isolation)

**Commercial admin (`/admin/commercial`):**
- [ ] "Commercial" button in admin nav links to `/admin/commercial`
- [ ] Job list loads with status filter tabs and search
- [ ] Selecting a job shows detail: client info, property info, submission photos, action panels
- [ ] Quote panel: enter estimate, "Send Quote Email" → client receives email with token link, job moves to `quote_sent`
- [ ] Quote email link (`/commercial/quote/:token`) loads correctly, shows estimate + deposit split
- [ ] Accept quote on quote page → status moves to `awaiting_payment`
- [ ] Pay deposit on quote page (test card `4242 4242 4242 4242`) → deposit confirmed, job moves to `scheduled`, admin receives notification email
- [ ] Schedule panel: set service date, "Mark In Progress"
- [ ] Completion panel: upload before + after photos, enter notes, "Complete & Send Packet" → client receives completion email with photos + final invoice link
- [ ] Final payment via Stripe hosted invoice link → `financially_completed_at` set
- [ ] Admin notes save without affecting client-visible data

**Error states:**
- [ ] Expired quote URL shows "no longer available"
- [ ] Used quote URL shows "You're All Set"
- [ ] Invalid/expired payment token → 400 error page
- [ ] Quote token rejected on `/invoice/:token/final` (wrong purpose)
- [ ] Admin logout → redirect to login, session does not persist

---

## Python Regression Test Setup (Staging)

Before running the Python regression suite against staging:

1. Create a staging Supabase project (never use production)
2. Run all migrations (001–015) against staging
3. Create test admin and client users in Supabase Auth
4. Insert admin user into `admin_users` table
5. Ensure admin user has a `commercial_clients` row for portal tests
6. Configure `TEST_IN_ZONE_ZIP`, `TEST_EXCLUDED_ZIP`, `TEST_UNAVAILABLE_ZIP` to match a real seeded service area config
7. Set `TEST_LOOKUP_SECRET` to a long random string; set the same value in both `.env.test` and the Netlify dev environment
8. Install Stripe CLI: `brew install stripe/stripe-cli/stripe` then `stripe login`
9. Start webhook forwarding: `stripe listen --forward-to localhost:8888/api/stripe-webhook`
   Copy the printed `whsec_...` → `STRIPE_WEBHOOK_SECRET` in `.env` and `.env.test`
10. Run: `NODE_ENV=test ENABLE_TEST_ENDPOINTS=true TEST_LOOKUP_SECRET=<secret> netlify dev --port 8888`
11. In a separate terminal: `pytest -m smoke -v` to verify setup
12. Run payment tests: `pytest -m payment -v` (requires `STRIPE_SECRET_KEY=sk_test_...`)

**CI secrets required** (GitHub Actions → Settings → Secrets):

| Secret | Notes |
|---|---|
| `SUPABASE_URL` | Staging project only |
| `SUPABASE_ANON_KEY` | Staging |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging |
| `TEST_ADMIN_EMAIL` | Must exist in staging auth |
| `TEST_ADMIN_PASSWORD` | |
| `TEST_CLIENT_EMAIL` | Must exist in staging auth with `commercial_clients` row |
| `TEST_CLIENT_PASSWORD` | |
| `TEST_IN_ZONE_ZIP` | Default: `30301` |
| `TEST_OUT_OF_ZONE_ZIP` | Default: `10001` |
| `TEST_EXCLUDED_ZIP` | Default: `30399` |
| `TEST_UNAVAILABLE_ZIP` | Default: `30350` |
| `TEST_LOOKUP_SECRET` | Long random string, same value in both server and test env |
| `STRIPE_SECRET_KEY` | **Test mode only** (`sk_test_...`) — never a live key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from `stripe listen` running in CI |
| `VITE_STRIPE_PUBLISHABLE_KEY` | **Test mode only** (`pk_test_...`) |
| `RESEND_API_KEY` | Resend API key for transactional email in staging |
| `RESEND_FROM_EMAIL` | Verified sender address for staging emails |
