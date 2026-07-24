"""
Full quote lifecycle: booking → admin approve → customer view → accept → complete.
"""
import hashlib
import uuid
from datetime import datetime, timezone, timedelta

import pytest

from tests.fixtures.factories import make_booking

pytestmark = pytest.mark.integration


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _create_booking(api, upload_session, test_run_id, test_service_area):
    payload = make_booking(upload_session, test_run_id)
    r = api.post("/api/create-booking", json=payload)
    assert r.status_code == 201
    return r.json()["bookingId"]


def _approve_quote(api, admin_headers, booking_id, price=350):
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    r = api.post("/api/approve-quote", json={
        "bookingId": booking_id,
        "approvedPrice": price,
        "estimateSnapshot": {"price": price},
        "settingsSnapshot": {},
        "availableSlots": [
            {"date": "2026-09-20", "startTime": "08:00", "endTime": "12:00"},
            {"date": "2026-09-21", "startTime": "13:00", "endTime": "17:00"},
        ],
        "expiresAt": expires_at,
        "customerTerms": {
            "priceAdjustmentNotice": "Price may vary by ±10%",
            "included": ["labor", "disposal"],
            "customerConfirmations": [
                "I confirm the items listed",
                "I understand the pricing",
                "I agree to the terms",
            ],
        },
    }, headers=admin_headers)
    assert r.status_code == 200, f"Approve failed: {r.text}"
    return r.json()


# ── Full lifecycle ────────────────────────────────────────────────────────────

@pytest.mark.smoke
@pytest.mark.regression
def test_full_quote_lifecycle(api, test_upload_session, test_run_id, test_service_area, admin_headers):
    """Happy path: create → approve → view → accept → complete."""
    # 1. Create booking
    booking_id = _create_booking(api, test_upload_session, test_run_id, test_service_area)

    # 2. Admin approves
    approval = _approve_quote(api, admin_headers, booking_id)
    assert approval.get("success") is True
    raw_token = approval["quoteToken"]
    assert len(raw_token) == 64

    # 3. Customer views quote
    view_r = api.get(f"/api/get-customer-quote?token={raw_token}")
    assert view_r.status_code == 200
    quote_data = view_r.json()
    assert quote_data["quote"]["price"] == 350
    assert "booking" in quote_data

    # 4. Customer accepts
    accept_r = api.post("/api/accept-quote", json={
        "token": raw_token,
        "pickupDate": "2026-09-20",
        "startTime": "08:00",
        "endTime": "12:00",
        "confirmations": [
            "I confirm the items listed",
            "I understand the pricing",
            "I agree to the terms",
        ],
        "idempotencyKey": str(uuid.uuid4()),
    })
    assert accept_r.status_code == 200
    assert accept_r.json()["success"] is True

    # 5. Admin completes job
    complete_r = api.post("/api/complete-job", json={
        "bookingId": booking_id,
        "actuals": {"finalAmount": 340},
    }, headers=admin_headers)
    assert complete_r.status_code == 200
    assert complete_r.json()["success"] is True


# ── Token validation ──────────────────────────────────────────────────────────

def test_invalid_token_rejected(api):
    r = api.get("/api/get-customer-quote?token=not-a-real-token")
    assert r.status_code == 400
    body = r.json()
    assert "error" in body
    # Generic message — does not reveal token existence
    assert body["error"] == "Unable to process this request"


def test_missing_token_rejected(api):
    r = api.get("/api/get-customer-quote")
    assert r.status_code in (400, 422)


def test_used_token_rejected(api, test_upload_session, test_run_id, test_service_area, admin_headers):
    """Token used once must be rejected on second use with different idempotency key."""
    booking_id = _create_booking(api, test_upload_session, test_run_id, test_service_area)
    approval = _approve_quote(api, admin_headers, booking_id)
    raw_token = approval["quoteToken"]

    # First acceptance
    api.post("/api/accept-quote", json={
        "token": raw_token,
        "pickupDate": "2026-09-20",
        "startTime": "08:00",
        "endTime": "12:00",
        "confirmations": ["a", "b", "c"],
        "idempotencyKey": str(uuid.uuid4()),
    })

    # Second attempt (different slot, different idempotency key)
    r2 = api.post("/api/accept-quote", json={
        "token": raw_token,
        "pickupDate": "2026-09-21",
        "startTime": "13:00",
        "endTime": "17:00",
        "confirmations": ["a", "b", "c"],
        "idempotencyKey": str(uuid.uuid4()),
    })
    assert r2.status_code == 409


def test_fewer_than_3_confirmations_rejected(api, test_upload_session, test_run_id, test_service_area, admin_headers):
    booking_id = _create_booking(api, test_upload_session, test_run_id, test_service_area)
    approval = _approve_quote(api, admin_headers, booking_id)
    raw_token = approval["quoteToken"]

    r = api.post("/api/accept-quote", json={
        "token": raw_token,
        "pickupDate": "2026-09-20",
        "startTime": "08:00",
        "endTime": "12:00",
        "confirmations": ["only one", "only two"],  # < 3
        "idempotencyKey": str(uuid.uuid4()),
    })
    assert r.status_code == 400
    assert "confirmation" in r.json().get("error", "").lower()


# ── Customer DTO field allowlist ──────────────────────────────────────────────

def test_internal_fields_absent_from_customer_dto(api, test_upload_session, test_run_id, test_service_area, admin_headers):
    booking_id = _create_booking(api, test_upload_session, test_run_id, test_service_area)
    approval = _approve_quote(api, admin_headers, booking_id)
    raw_token = approval["quoteToken"]

    r = api.get(f"/api/get-customer-quote?token={raw_token}")
    assert r.status_code == 200
    body = r.json()

    booking_keys = set(body.get("booking", {}).keys())
    assert "internal_notes" not in booking_keys
    assert "internal_estimate" not in booking_keys
    assert "risk_flags" not in booking_keys
    assert "blocker_overrides" not in booking_keys
    assert "actuals" not in booking_keys

    quote_keys = set(body.get("quote", {}).keys())
    assert "estimate_snapshot" not in quote_keys
    assert "settings_snapshot" not in quote_keys
    assert "admin_override" not in quote_keys
    assert "admin_id" not in quote_keys
    assert "recommended_price" not in quote_keys


# ── complete-job validation ───────────────────────────────────────────────────

def test_complete_job_requires_admin_auth(api, test_booking):
    r = api.post("/api/complete-job", json={"bookingId": test_booking, "actuals": {"finalAmount": 100}})
    assert r.status_code == 401


def test_complete_job_validates_final_amount(api, admin_headers, test_booking):
    r = api.post("/api/complete-job", json={
        "bookingId": test_booking,
        "actuals": {},  # missing finalAmount
    }, headers=admin_headers)
    assert r.status_code == 400
    assert "finalAmount" in r.json().get("error", "")


def test_complete_job_wrong_status_rejected(api, admin_headers, test_booking):
    """Booking is pending_review; completing it without going through quote flow should fail."""
    r = api.post("/api/complete-job", json={
        "bookingId": test_booking,
        "actuals": {"finalAmount": 100},
    }, headers=admin_headers)
    # pending_review → cannot complete
    assert r.status_code == 400


def test_approve_quote_requires_admin(api, test_booking):
    r = api.post("/api/approve-quote", json={"bookingId": test_booking, "approvedPrice": 100, "estimateSnapshot": {}})
    assert r.status_code == 401
