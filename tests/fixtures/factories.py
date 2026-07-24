"""
Test data factories. All generated records include the testRunId so they
can be precisely cleaned up via the test-lookup DELETE endpoint.
"""
import uuid

_counter = 0


def _next_id() -> str:
    global _counter
    _counter += 1
    return str(_counter)


def make_email(test_run_id: str) -> str:
    return f"test-{test_run_id}-{uuid.uuid4().hex[:6]}@squatterz-test.com"


def make_zip() -> str:
    """Return a syntactically valid ZIP that is unlikely to be in any configured list."""
    return "00501"


def make_customer(test_run_id: str, name_prefix: str = "TEST") -> dict:
    return {
        "firstName": f"{name_prefix}-{test_run_id[:6]}",
        "lastName": "Fixture",
        "phone": "5550100001",
        "email": make_email(test_run_id),
    }


def make_booking(session_id: str, test_run_id: str, **overrides) -> dict:
    """Return a complete valid create-booking payload."""
    base = {
        "sessionId": session_id,
        "idempotencyKey": str(uuid.uuid4()),
        "customerName": f"TEST-{test_run_id[:6]} Fixture",
        "customerPhone": "5550100001",
        "customerEmail": make_email(test_run_id),
        "address": "123 Test St",
        "city": "Atlanta",
        "state": "GA",
        "zip": "30301",  # expected to be in TEST_IN_ZONE_ZIP
        "fullAddress": "123 Test St, Atlanta, GA 30301",
        "quantity": "A few items (1-5)",
        "accessType": "curbside",
        "stairs": "none",
        "elevator": "no",
        "preferredDate": "2026-09-15",
        "secondChoiceDate": "2026-09-16",
        "timePreference": "morning",
        "testRunId": test_run_id,
    }
    base.update(overrides)
    return base


def make_work_order(property_id: str, test_run_id: str, **overrides) -> dict:
    base = {
        "property_id": property_id,
        "unit": f"TEST-{test_run_id[:6]}-Unit",
        "description": f"TEST-{test_run_id[:6]} fixture work order",
        "preferred_date": "2026-09-20",
        "access_notes": "Gate code 1234",
        "status": "open",
    }
    base.update(overrides)
    return base


def make_property(client_id: str, test_run_id: str, **overrides) -> dict:
    base = {
        "client_id": client_id,
        "name": f"TEST-{test_run_id[:6]} Property",
        "address": "456 Test Ave, Atlanta, GA 30301",
    }
    base.update(overrides)
    return base
