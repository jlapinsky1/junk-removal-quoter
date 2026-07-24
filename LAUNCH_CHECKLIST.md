# Launch Checklist

## Required Environment Variables

### Netlify (server-side)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Anon key (for admin JWT verification) |
| `ANTHROPIC_API_KEY` | Claude API key for photo analysis |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server secret (optional — uploads work without it) |
| `NODE_ENV` | Set to `test` only in test environments — never in production |
| `ENABLE_TEST_ENDPOINTS` | Set to `true` only in test environments — never in production |
| `TEST_LOOKUP_SECRET` | Secret for the test-only lookup endpoint — never in production |

### Vite (client-side, prefixed with `VITE_`)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
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

No anonymous or generic authenticated access to any table.

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

### Customer Quote Acceptance
1. Open the quote URL from step 5 (`/quote/{token}`)
2. Verify only customer-safe fields are shown (no margins, costs, internal notes)
3. Check all 3 confirmation boxes
4. Select a time slot and accept
5. Verify confirmation screen
6. Check Supabase: `quote_acceptances`, `slot_reservations` (status=reserved), booking status=scheduled, token used_at set
7. Revisit the same URL — should show "You're All Set" (not re-acceptance form)

### Job Completion
1. In admin, open the scheduled booking
2. Click "Mark Job Complete" and fill in actuals
3. Save — verify booking status=completed, actuals stored
4. Try completing again — should fail with "already completed"

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
- [ ] Goal/pace dashboard reflects current bookings
- [ ] Learning dashboard shows calibration suggestions when data exists

**Commercial portal:**
- [ ] Portal login → dashboard renders correctly
- [ ] New work order request form → submission confirmation
- [ ] Completion packet PDF opens correctly in browser
- [ ] Client cannot access another client's data (isolation)

**Error states:**
- [ ] Expired quote URL shows "no longer available"
- [ ] Used quote URL shows "You're All Set"
- [ ] Admin logout → redirect to login, session does not persist

---

## Python Regression Test Setup (Staging)

Before running the Python regression suite against staging:

1. Create a staging Supabase project (never use production)
2. Run all migrations against staging
3. Create test admin and client users in Supabase Auth
4. Insert admin user into `admin_users` table
5. Ensure admin user has a `commercial_clients` row for portal tests
6. Configure `TEST_IN_ZONE_ZIP`, `TEST_EXCLUDED_ZIP`, `TEST_UNAVAILABLE_ZIP` to match a real seeded service area config
7. Set `TEST_LOOKUP_SECRET` to a long random string; set the same value in both `.env.test` and the Netlify dev environment
8. Run: `NODE_ENV=test ENABLE_TEST_ENDPOINTS=true TEST_LOOKUP_SECRET=<secret> netlify dev --port 8888`
9. In a separate terminal: `pytest -m smoke -v` to verify setup

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
