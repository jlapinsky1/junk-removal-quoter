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
| File storage | Supabase Storage (booking photos) |
| Auth | Supabase Auth (JWT) |
| Photo analysis | Anthropic Claude API |
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
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_MAPS_API_KEY=   # optional
TURNSTILE_SECRET_KEY=        # optional
VITE_TURNSTILE_SITE_KEY=    # optional
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
pytest tests/unit/                                        # date logic (Node subprocess)
pytest --junitxml=reports/junit.xml                       # CI output
pytest -m smoke --junitxml=reports/smoke-junit.xml -v     # verbose CI smoke run
```

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
    test_quote_lifecycle.py     # approve → view → accept → complete
    test_admin_endpoints.py     # admin auth, service area config CRUD

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
| `/api/approve-quote` | POST | admin JWT | Admin approves quote with price |
| `/api/accept-quote` | POST | quote token | Customer confirms booking slot |
| `/api/complete-job` | POST | admin JWT | Mark job complete, record actuals |
| `/api/get-customer-quote` | GET | quote token | Customer quote view (DTO — no internal costs) |
| `/api/admin/service-area` | GET + PUT | admin JWT | Read/write service area ZIP config |
| `/api/signup` | POST | none | Portal account signup |
| `/api/reset-password` | POST | none | Password reset email |
| `/api/notify-expansion` | POST | none | Out-of-zone expansion lead capture |
| `/api/completion-packet` | GET | client JWT | Completion PDF for commercial clients |
| `/api/analyze-photos` | POST | admin JWT | Claude AI photo analysis |
| `/api/test/lookup` | GET + DELETE | X-Test-Secret | Test-only record lookup (disabled in prod) |

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

The commercial portal is a separate authenticated experience for recurring business clients:

- Clients authenticate via Supabase Auth
- Properties and jobs (work orders) are accessed directly via Supabase REST with RLS
- RLS scopes all rows to `commercial_clients.user_id = auth.uid()` — no cross-tenant data leakage
- No Netlify Functions wrapper for portal CRUD — Supabase enforces access at the database level

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

---

## CI

`.github/workflows/regression.yml` runs on push to master and pull requests:

1. Checkout, Node 22, Python 3.12, `npm ci`, `pip install -r requirements-test.txt`
2. Install `netlify-cli`, write `.env.test` from GitHub Secrets
3. Start `netlify dev --port 8888` in background with `NODE_ENV=test ENABLE_TEST_ENDPOINTS=true`
4. Wait for `/api/health` to return 200 (retry loop, max 60s)
5. Seed service area ZIP config via admin API
6. Run smoke tests (fail-fast gate) — blocks deploy on failure
7. Run full regression suite (on push to master)
8. Run security tests (on push to master)
9. Upload JUnit XML artifacts to GitHub Actions

---

## Build for Production

```bash
npm run build     # outputs to dist/
npm run preview   # local preview of prod build
```

Deploy via Netlify: connect the GitHub repo, set build command `npm run build`, publish directory `dist`, and configure all required environment variables.

See `LAUNCH_CHECKLIST.md` for the full pre-production checklist.
