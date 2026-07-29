# Junk Removal Quoter

A full-stack platform for a junk removal business: residential booking flow, admin operations dashboard, commercial client portal, and AI-assisted photo quoting — all running on Netlify Functions + Supabase.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS |
| API | Netlify Functions (ES modules) |
| Database | Supabase (Postgres + RLS) |
| Blob storage | Netlify Blobs (service area config) |
| File storage | Supabase Storage (booking photos, private bucket) |
| Auth | Supabase Auth (JWT) |
| Payments | Stripe (deposit + final balance via invoice) |
| Photo analysis | Anthropic Claude API |
| Email | Resend |
| CAPTCHA | Cloudflare Turnstile (optional) |

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment files
cp .env.example .env
cp .env.test.example .env.test   # only needed for running tests

# Start Netlify dev server (runs Functions + Vite together)
netlify dev
```

Netlify dev listens on `http://localhost:8888` by default.

### Required .env variables for local dev

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
SHOP_LAT=                    # shop/home-base latitude — enables real travel time
SHOP_LNG=                    # shop/home-base longitude — enables real travel time
ADMIN_EMAIL=                 # admin notification address for new commercial job requests
VITE_GOOGLE_MAPS_API_KEY=   # optional
TURNSTILE_SECRET_KEY=        # optional
VITE_TURNSTILE_SITE_KEY=    # optional
```

For payment testing, also start Stripe CLI webhook forwarding:

```bash
stripe listen --forward-to localhost:8888/api/stripe-webhook
# Copy the whsec_... value → STRIPE_WEBHOOK_SECRET in .env
```

---

## JavaScript Tests (Vitest)

```bash
npm test           # run all JS unit tests (watch mode)
npm run test:run   # single pass
```

The JS test suite covers all business-logic utilities (goal engine, decision engine, calibration, route scoring, date logic, service area, variance analysis, etc.). All 326 tests run in Vitest — no coverage tool is configured in the Python suite, which generates JUnit XML only.

---

## Python Regression Tests (pytest)

The Python suite exercises real HTTP endpoints against a running `netlify dev` instance, including Supabase persistence and RLS verification.

### Setup

```bash
# Install Python test dependencies
pip install -r requirements-test.txt

# Copy and fill in .env.test
cp .env.test.example .env.test
# Edit .env.test with your staging Supabase credentials
```

### Running netlify dev for tests

The test server requires three extra env vars:

```bash
NODE_ENV=test ENABLE_TEST_ENDPOINTS=true TEST_LOOKUP_SECRET=<secret> netlify dev --port 8888
```

### Test commands

```bash
pytest -m smoke                                           # fast critical-path gate (<90s)
pytest -m "regression and not smoke"                      # full regression suite
pytest -m security                                        # security regression
pytest -m integration                                     # all integration tests
pytest -m payment                                         # payment flow tests (Stripe required)
pytest -m completion                                      # completion package tests
pytest -m dispatch                                        # dispatch enforcement tests
pytest tests/unit/                                        # date logic (Node subprocess)
pytest --junitxml=reports/junit.xml                       # CI output
pytest -m smoke --junitxml=reports/smoke-junit.xml -v     # verbose CI smoke run
```

Payment tests require `STRIPE_SECRET_KEY` (test mode) and `stripe listen` running for webhook-dependent tests.

### Test suite structure

```
tests/
  conftest.py              # global fixtures, env loading, testRunId generation
  pytest.ini
  requirements-test.txt

  unit/
    test_date_logic.py     # date algorithm via Node subprocess with explicit referenceDate

  integration/
    test_service_area.py   # ZIP validation, config persistence, fail-closed behavior
    test_booking.py        # residential booking, required fields, idempotency
    test_auth.py           # login, session, role isolation, portal signup
    test_commercial.py     # property + job CRUD via Supabase REST
    test_work_orders.py    # job status transitions, field persistence
    test_portal_visibility.py  # cross-tenant RLS isolation
    test_expansion.py      # notify-expansion validation + persistence
    test_failure_handling.py   # exact status codes for known error conditions
    test_security.py       # injection strings, stack trace suppression, ID tampering

  api/
    test_check_service_area.py  # full ZIP parameter matrix
    test_create_booking.py      # field matrix, server-side enforcement
    test_upload_flow.py         # session lifecycle, file validation
    test_quote_lifecycle.py     # approve → view → deposit → complete
    test_admin_endpoints.py     # admin auth, service area config CRUD
    test_payment_flow.py        # deposit calculation, create-deposit-payment, payment-summary
    test_completion_package.py  # complete-job validation, photo paths, PDF access control

  integration/
    ...
    test_dispatch_enforcement.py   # deposit must be confirmed before job completion

  fixtures/
    factories.py           # make_booking(), make_work_order(), make_email(), etc.

  helpers/
    api.py                 # APIClient wrapping requests.Session
    auth.py                # acquire_admin_token(), acquire_client_token()
    supabase_client.py     # service-role REST client for setup/teardown only

  node-adapter/
    date-logic.js          # CLI wrapper for getAvailableBookingDates
```

### Test isolation

Every test session generates a unique `testRunId` (12-char UUID hex). All created records are tagged with this ID in the `test_run_id` column. Teardown uses the `/api/test/lookup` DELETE endpoint scoped to that `testRunId` — never a global `DELETE WHERE name LIKE 'TEST-%'`.

### Test-only endpoint security

`/api/test/lookup` only activates when ALL three conditions are met in the running server:
- `NODE_ENV=test`
- `ENABLE_TEST_ENDPOINTS=true`
- `TEST_LOOKUP_SECRET` is set

Returns 404 (not 403) when disabled — does not reveal its existence. Secret comparison uses `crypto.timingSafeEqual`.

---

## Netlify Functions (API endpoints)

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/health` | GET | none | Readiness probe — returns `{ status: "ok" }` |
| `/api/check-service-area` | POST | none | ZIP serviceability check |
| `/api/create-upload-session` | POST | none | Create photo upload session |
| `/api/get-upload-url` | POST | none | Signed URL for photo upload |
| `/api/create-booking` | POST | none | Submit residential booking |
| `/api/approve-quote` | POST | admin JWT | Admin approves quote; creates Stripe customer + invoice |
| `/api/get-customer-quote` | GET | quote token | Customer quote view (DTO — no internal costs) |
| `/api/create-deposit-payment` | POST | quote token | Reserve slot + create deposit PaymentIntent (50%) |
| `/api/stripe-webhook` | POST | Stripe sig | Handle `invoice_payment.paid`, `invoice.paid`, `payment_intent.payment_failed` |
| `/api/payment-summary` | GET | token or admin JWT | Safe payment DTO for customer or admin |
| `/api/get-completion-photo-url` | POST | admin JWT | Signed upload URL for after-job photos |
| `/api/complete-job` | POST | admin JWT | Save completion package + trigger final payment request |
| `/api/get-final-job-page` | GET | payment token | Customer final page: completion data + signed photo URLs + final PI secret |
| `/api/residential-completion-pdf` | GET | payment token or admin JWT | Completion report PDF (pdfkit, clean text-only summary) |
| `/api/reconcile-stripe` | POST | admin JWT | Re-link or repair Stripe ↔ Supabase state |
| `/api/admin-payment-action` | POST | admin JWT | Refresh status, resend final link, reconcile |
| `/api/geocode-booking` | POST | none | Geocode customer address via Nominatim; compute Haversine travel time from shop origin; store on booking |
| `/api/accept-quote` | POST | quote token | Legacy slot reservation (pre-payment flow) |
| `/api/admin/service-area` | GET + PUT | admin JWT | Read/write service area ZIP config |
| `/api/signup` | POST | none | Portal account signup |
| `/api/reset-password` | POST | none | Password reset email |
| `/api/notify-expansion` | POST | none | Out-of-zone expansion lead capture |
| `/api/completion-packet` | GET | client JWT | Completion PDF for commercial clients |
| `/api/analyze-photos` | POST | admin JWT | Claude AI photo analysis |
| `/api/get-admin-completed-bookings` | GET | admin JWT | Paginated, server-side search of completed bookings |
| `/api/get-admin-completion-detail` | GET | admin JWT | Full completion detail for a single booking (support view) |
| `/api/admin-support-note` | POST | admin JWT | Add a timestamped internal support note |
| `/api/dispatch-job` | POST | dispatch token | Mark job in_progress (requires deposit confirmed) |
| `/api/dispatch-complete` | POST | dispatch token | Submit job completion package from dispatch interface |
| `/api/dispatch-status` | GET | dispatch token | Get current job status for dispatch |
| `/api/dispatch-photo` | POST | dispatch token | Upload a completion photo from dispatch |
| `/api/dispatch-photo-upload-url` | POST | dispatch token | Get signed URL for dispatch photo upload |
| `/api/dispatch-report-issue` | POST | dispatch token | Report a job issue from dispatch |
| `/api/dispatch-jobs-today` | GET | dispatch token | List today's jobs for dispatch |
| `/api/test/lookup` | GET + DELETE | X-Test-Secret | Test-only record lookup (disabled in prod) |

### Commercial portal endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/create-commercial-job` | POST | client JWT | Submit work order (creates job, links photos, sends admin + client emails) |
| `/api/get-admin-commercial-jobs` | GET | admin JWT | Paginated, filterable commercial job list |
| `/api/get-admin-commercial-job-detail` | GET | admin JWT | Full job detail: client, property, photos, Stripe payment summary |
| `/api/send-commercial-quote` | POST | admin JWT | Set estimate, create Stripe invoice, send quote email with token link |
| `/api/get-commercial-quote` | GET | quote token | Public quote view DTO (no PII beyond names, no internal costs) |
| `/api/accept-commercial-quote` | POST | token or client JWT | Accept quote → status `awaiting_payment` |
| `/api/create-commercial-deposit` | POST | token or client JWT | Create Stripe deposit PaymentIntent (50%) |
| `/api/update-commercial-job` | POST | admin JWT | Update status, scheduled date, or admin notes |
| `/api/complete-commercial-job` | POST | admin JWT | Mark complete, link before/after photos, send completion packet + final invoice email |

---

## Service Area Architecture

Service area config is stored in Netlify Blobs (not the database) so it survives cold starts without a DB round-trip. Evaluation priority:

1. `invalid_zip` — not 5 digits
2. `excluded` — explicitly excluded list
3. `unavailable` — temporarily unavailable list
4. `unconfigured` — no config exists (fail-open, allows booking)
5. `serviceable` — in the serviceable list
6. `outside` — default for anything else

**Fail-closed behavior:** If the Blobs config load throws an infrastructure error during booking, `create-booking` returns 503 and blocks the booking. Only the `unconfigured` state (intentional zero-config) is allowed to pass through.

---

## Commercial Portal

The commercial portal is a separate authenticated experience for recurring business clients (property managers, etc.) with a full end-to-end workflow mirroring the residential flow:

### Client-side routes
| Route | Description |
|---|---|
| `/commercial` | Marketing/info page |
| `/portal/login` | Portal sign-in / account setup |
| `/portal` | Authenticated client dashboard (jobs, invoices, properties) |
| `/commercial/quote/:token` | Public quote acceptance page (no login required — linked from quote email) |

### Admin-side route
| Route | Description |
|---|---|
| `/admin/commercial` | Separate commercial job queue (distinct from residential `/admin`) |

### Commercial job status flow
```
pending_review → quote_sent → awaiting_payment → scheduled → in_progress → completed
```

### How it works
1. Client submits work order via portal (with optional drag-and-drop photos)
2. Admin reviews at `/admin/commercial`, sets estimate, clicks "Send Quote"
3. Client receives email with quote amount + "Review & Accept" link → `/commercial/quote/:token`
4. Client accepts quote and pays 50% deposit via Stripe (no login required on the quote page, or via portal)
5. Stripe webhook confirms deposit → job moves to `scheduled`; admin receives email notification
6. Admin updates scheduled date, marks `in_progress` when crew arrives
7. Admin uploads before/after photos, adds completion notes, clicks "Complete & Send Packet"
8. Client receives completion packet email (before/after photos + final invoice link)
9. Client pays remaining 50% balance via Stripe hosted invoice page
10. `invoice.paid` webhook → `financially_completed_at` set; completion packet visible in portal

### Auth model
- Clients authenticate via Supabase Auth; RLS scopes all rows to `commercial_clients.user_id = auth.uid()` — no cross-tenant data leakage
- Quote acceptance via email token requires no login (token-based, 7-day expiry)
- All write operations from Netlify Functions use the service role (bypasses RLS); ownership is verified server-side

---

## Date Logic

`getAvailableBookingDates()` is extracted to `src/utils/dateLogic.js` and accepts an explicit `referenceDate` parameter instead of calling `new Date()` internally. This makes the algorithm deterministically testable from a Node subprocess without freezing system time. `BookingFlow.jsx` passes `new Date()` at the call site.

---

## Database Migrations

| File | Contents |
|---|---|
| `001_initial_schema.sql` | Core tables, RLS policies, RPCs, triggers |
| `002_business_goals.sql` | Goal tracking + snapshots |
| `003_decision_context.sql` | `decision_context` column on `quote_snapshots` |
| `004_calibration.sql` | `calibration_records` table |
| `005_route_cache.sql` | `location_cache`, `travel_cache`, geocoding columns |
| `006_commercial_portal.sql` | `commercial_clients`, `properties`, `jobs`, `invoices` |
| `007_service_area_admin.sql` | Admin service area config |
| `008_expansion_leads_and_test_run_id.sql` | `expansion_leads` table, `test_run_id` column on `bookings` |
| `009_stripe_payment.sql` | Stripe columns on `bookings`, `slot_reservations.expires_at`, `payment_access_tokens`, `processed_stripe_events`, `booking_completions`, `booking_photos.kind`; updated audit event types; `initiate_payment_atomic`, `confirm_deposit_atomic`, `cleanup_expired_slot_reservations` RPCs |
| `010_fix_approve_quote_atomic.sql` | Recreates `approve_quote_atomic` with `p_decision_context JSONB DEFAULT NULL` parameter and stores it on `quote_snapshots` |
| `011_fix_sessions_booking_fk.sql` | Changes `fk_sessions_booking` FK (`upload_sessions.consumed_by_booking → bookings`) to `ON DELETE SET NULL` to allow booking deletion without FK violation |
| `012_support_notes.sql` | `support_notes` table for admin-only timestamped notes on completed bookings; RLS via `is_admin()` |
| `013_dispatch.sql` | Dispatch interface tables and auth: `dispatch_tokens`, `dispatch_events`; status transitions for `in_progress` enforcement |
| `014_distance_fields.sql` | Adds `distance_miles` and `travel_minutes_one_way` columns to `bookings`; populated by `geocode-booking` function |
| `015_commercial_workflow.sql` | Extends `jobs` table for full quote→deposit→completion workflow: expands status enum (adds `pending_review`, `quote_sent`, `awaiting_payment`; migrates `open` → `pending_review`), adds Stripe/quote/payment columns, adds `submission` kind to `job_photos` |

---

## CI

`.github/workflows/regression.yml` runs on push to master and pull requests:

1. Checkout, Node 22, Python 3.12, `npm ci`, `pip install -r requirements-test.txt`
2. Install `netlify-cli` and Stripe CLI, write `.env.test` from GitHub Secrets
3. Start `netlify dev --port 8888` in background with `NODE_ENV=test ENABLE_TEST_ENDPOINTS=true`
4. Start `stripe listen --forward-to localhost:8888/api/stripe-webhook` in background
5. Wait for `/api/health` to return 200 (retry loop, max 60s)
6. Seed service area ZIP config via admin API
7. Run smoke tests (fail-fast gate) — blocks deploy on failure
8. Run full regression suite (on push to master)
9. Run security tests (on push to master)
10. Upload JUnit XML artifacts to GitHub Actions

---

## Build for Production

```bash
npm run build     # outputs to dist/
npm run preview   # local preview of prod build
```

Deploy via Netlify: connect the GitHub repo, set build command `npm run build`, publish directory `dist`, and configure all required environment variables.

See `LAUNCH_CHECKLIST.md` for the full pre-production checklist.
