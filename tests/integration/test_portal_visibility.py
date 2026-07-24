"""
Tenant isolation: client A cannot see client B's data.
Internal admin fields must not appear in client-facing DTOs.

These tests require two distinct commercial client accounts.
If only one test account is configured, cross-tenant tests are skipped.
"""
import os
import uuid

import pytest
import requests as req

pytestmark = pytest.mark.regression


def supabase_rest(method: str, table: str, token: str, **kwargs):
    url = f"{os.environ['SUPABASE_URL']}/rest/v1/{table}"
    headers = {
        "apikey": os.environ["SUPABASE_ANON_KEY"],
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    return req.request(method, url, headers=headers, timeout=10, **kwargs)


def _get_user_id(token: str) -> str:
    import base64, json
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))["sub"]


def _get_client_id(token: str, supabase) -> str | None:
    uid = _get_user_id(token)
    rows = supabase.select("commercial_clients", {"user_id": f"eq.{uid}"})
    return rows[0]["id"] if rows else None


@pytest.fixture(scope="module")
def second_client_token():
    """
    Optionally configured second client account for cross-tenant tests.
    Set TEST_CLIENT2_EMAIL and TEST_CLIENT2_PASSWORD to enable.
    """
    email = os.environ.get("TEST_CLIENT2_EMAIL")
    password = os.environ.get("TEST_CLIENT2_PASSWORD")
    if not email or not password:
        return None
    from tests.helpers.auth import acquire_token
    try:
        return acquire_token(email, password, os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
    except Exception:
        return None


# ── Cross-tenant isolation ────────────────────────────────────────────────────

def test_client_a_sees_own_properties(client_token, supabase):
    client_id = _get_client_id(client_token, supabase)
    if not client_id:
        pytest.skip("No commercial client profile for test client")

    # Create a property as client A
    r = supabase_rest("POST", "properties", client_token, json={
        "client_id": client_id,
        "name": f"TEST-visibility-{uuid.uuid4().hex[:6]}",
        "address": "123 Visible St",
    })
    assert r.status_code in (200, 201)
    prop_id = r.json()[0]["id"] if isinstance(r.json(), list) else r.json()["id"]

    # Client A can read it
    get_r = supabase_rest("GET", "properties", client_token,
                           params={"id": f"eq.{prop_id}", "select": "id,name"})
    assert get_r.status_code == 200
    assert len(get_r.json()) == 1

    # Cleanup
    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id}"})


def test_client_b_cannot_see_client_a_properties(client_token, second_client_token, supabase):
    if not second_client_token:
        pytest.skip("Second client account not configured (TEST_CLIENT2_EMAIL/TEST_CLIENT2_PASSWORD)")

    client_id_a = _get_client_id(client_token, supabase)
    if not client_id_a:
        pytest.skip("No commercial client profile for client A")

    # Create a property as client A
    r_a = supabase_rest("POST", "properties", client_token, json={
        "client_id": client_id_a,
        "name": f"TEST-private-{uuid.uuid4().hex[:6]}",
        "address": "456 Private St",
    })
    assert r_a.status_code in (200, 201)
    prop_id_a = r_a.json()[0]["id"] if isinstance(r_a.json(), list) else r_a.json()["id"]

    # Client B tries to read it
    get_r = supabase_rest("GET", "properties", second_client_token,
                           params={"id": f"eq.{prop_id_a}", "select": "id,name"})
    assert get_r.status_code == 200
    assert get_r.json() == [], f"Client B should not see client A's property, got {get_r.json()}"

    # Cleanup
    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id_a}"})


def test_client_b_cannot_see_client_a_jobs(client_token, second_client_token, supabase):
    if not second_client_token:
        pytest.skip("Second client account not configured")

    client_id_a = _get_client_id(client_token, supabase)
    if not client_id_a:
        pytest.skip("No commercial client profile for client A")

    # Property + job for client A
    prop_r = supabase_rest("POST", "properties", client_token, json={
        "client_id": client_id_a,
        "name": f"TEST-job-vis-{uuid.uuid4().hex[:4]}",
        "address": "789 Job Vis St",
    })
    prop_id = prop_r.json()[0]["id"] if isinstance(prop_r.json(), list) else prop_r.json()["id"]

    job_r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": prop_id,
        "description": "TEST private job",
        "status": "open",
    })
    job_id = job_r.json()[0]["id"] if isinstance(job_r.json(), list) else job_r.json()["id"]

    # Client B query
    get_r = supabase_rest("GET", "jobs", second_client_token,
                           params={"id": f"eq.{job_id}", "select": "id"})
    assert get_r.status_code == 200
    assert get_r.json() == [], "Client B should not see client A's jobs"

    # Cleanup
    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})
    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id}"})


def test_client_cannot_insert_job_for_another_clients_property(client_token, second_client_token, supabase):
    """Client B must not be able to create a job under client A's property."""
    if not second_client_token:
        pytest.skip("Second client account not configured")

    client_id_a = _get_client_id(client_token, supabase)
    if not client_id_a:
        pytest.skip("No commercial client profile for client A")

    # Client A creates a property
    prop_r = supabase_rest("POST", "properties", client_token, json={
        "client_id": client_id_a,
        "name": f"TEST-rls-{uuid.uuid4().hex[:4]}",
        "address": "1 RLS Test St",
    })
    prop_id = prop_r.json()[0]["id"] if isinstance(prop_r.json(), list) else prop_r.json()["id"]

    # Client B tries to create a job under client A's property
    r = supabase_rest("POST", "jobs", second_client_token, json={
        "property_id": prop_id,
        "description": "TEST unauthorized job",
        "status": "open",
    })
    # Should either be rejected (403/401) or return 0 rows (RLS silently drops)
    if r.status_code in (200, 201):
        created = r.json()
        assert created == [] or created is None, "RLS should have blocked this insert"

    # Cleanup
    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id}"})


# ── Completed jobs remain visible ─────────────────────────────────────────────

def test_completed_jobs_visible_in_history(client_token, supabase):
    """Completed jobs must not disappear from the client's history view."""
    client_id = _get_client_id(client_token, supabase)
    if not client_id:
        pytest.skip("No profile for test client")

    # Create property + job, mark job completed via service role
    prop_r = supabase_rest("POST", "properties", client_token, json={
        "client_id": client_id,
        "name": f"TEST-hist-{uuid.uuid4().hex[:4]}",
        "address": "10 History St",
    })
    prop_id = prop_r.json()[0]["id"] if isinstance(prop_r.json(), list) else prop_r.json()["id"]

    job_r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": prop_id,
        "description": "TEST completed job",
        "status": "open",
    })
    job_id = job_r.json()[0]["id"] if isinstance(job_r.json(), list) else job_r.json()["id"]

    # Mark completed via service role (bypasses status-check logic)
    supabase.update("jobs", {"status": "completed"}, {"id": f"eq.{job_id}"})

    # Client should still see it
    get_r = supabase_rest("GET", "jobs", client_token,
                           params={"id": f"eq.{job_id}", "status": "eq.completed", "select": "id,status"})
    assert get_r.status_code == 200
    rows = get_r.json()
    assert any(row["id"] == job_id for row in rows), "Completed job should still be visible"

    # Cleanup
    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})
    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id}"})
