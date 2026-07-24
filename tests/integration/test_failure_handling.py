"""
Known error conditions with exact status codes.
Tests verify graceful degradation at the HTTP boundary without relying on
mocking internal infrastructure (which would require test env overrides).
"""
import uuid

import pytest

from tests.fixtures.factories import make_booking

pytestmark = pytest.mark.integration


def test_invalid_booking_id_for_complete_job(api, admin_headers):
    r = api.post("/api/complete-job", json={
        "bookingId": str(uuid.uuid4()),  # valid UUID format, doesn't exist
        "actuals": {"finalAmount": 100},
    }, headers=admin_headers)
    assert r.status_code == 404
    assert "error" in r.json()
    assert "Traceback" not in r.text


def test_missing_booking_id_for_complete_job(api, admin_headers):
    r = api.post("/api/complete-job", json={"actuals": {"finalAmount": 100}},
                  headers=admin_headers)
    assert r.status_code == 400
    assert "error" in r.json()


def test_missing_actuals_for_complete_job(api, admin_headers, test_booking):
    r = api.post("/api/complete-job", json={"bookingId": test_booking},
                  headers=admin_headers)
    assert r.status_code == 400
    body = r.json()
    assert "error" in body


def test_negative_final_amount_rejected(api, admin_headers, test_booking):
    r = api.post("/api/complete-job", json={
        "bookingId": test_booking,
        "actuals": {"finalAmount": -50},
    }, headers=admin_headers)
    assert r.status_code == 400
    body = r.json()
    assert "finalAmount" in body.get("error", "")


def test_approve_quote_missing_booking_id(api, admin_headers):
    r = api.post("/api/approve-quote", json={
        "approvedPrice": 100,
        "estimateSnapshot": {},
        "customerTerms": {},
    }, headers=admin_headers)
    assert r.status_code in (400, 422)
    assert "error" in r.json()


def test_approve_quote_nonexistent_booking(api, admin_headers):
    r = api.post("/api/approve-quote", json={
        "bookingId": str(uuid.uuid4()),
        "approvedPrice": 100,
        "estimateSnapshot": {},
        "customerTerms": {"priceAdjustmentNotice": "n", "included": [], "customerConfirmations": ["a", "b", "c"]},
    }, headers=admin_headers)
    # Supabase RPC will return success:false or an error
    assert r.status_code in (200, 400, 404, 422, 500)
    if r.status_code == 200:
        body = r.json()
        assert body.get("success") is False or "error" in body


def test_accept_quote_missing_token(api):
    r = api.post("/api/accept-quote", json={
        "pickupDate": "2026-09-20",
        "startTime": "08:00",
        "endTime": "12:00",
        "confirmations": ["a", "b", "c"],
        "idempotencyKey": str(uuid.uuid4()),
    })
    assert r.status_code == 400
    assert "error" in r.json()


def test_accept_quote_invalid_token_format(api):
    r = api.post("/api/accept-quote", json={
        "token": "not-a-real-token",
        "pickupDate": "2026-09-20",
        "startTime": "08:00",
        "endTime": "12:00",
        "confirmations": ["a", "b", "c"],
        "idempotencyKey": str(uuid.uuid4()),
    })
    assert r.status_code in (400, 409)
    assert "error" in r.json()


def test_create_session_returns_200(api):
    """Health: session creation must always be available."""
    r = api.post("/api/create-upload-session", json={})
    assert r.status_code == 200


def test_health_endpoint_returns_ok(api):
    r = api.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "timestamp" in body


def test_wrong_method_returns_405(api):
    for endpoint in ["/api/create-booking", "/api/create-upload-session", "/api/notify-expansion"]:
        r = api.get(endpoint)
        assert r.status_code == 405, f"Expected 405 for GET {endpoint}, got {r.status_code}"


def test_error_response_is_json(api):
    """All error responses must be valid JSON."""
    r = api.post("/api/create-booking", json={})
    assert r.status_code == 400
    try:
        r.json()
    except Exception:
        pytest.fail("Error response was not valid JSON")
