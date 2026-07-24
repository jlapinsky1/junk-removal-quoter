"""
Commercial portal: property CRUD and job request via Supabase REST API.
These operations go directly to Supabase (no Netlify Function wrapper).
Tests use the client JWT acquired from TEST_CLIENT_EMAIL credentials.
"""
import os
import uuid

import pytest
import requests as req

pytestmark = pytest.mark.integration


def supabase_rest(method: str, table: str, token: str, **kwargs):
    url = f"{os.environ['SUPABASE_URL']}/rest/v1/{table}"
    headers = {
        "apikey": os.environ["SUPABASE_ANON_KEY"],
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    return req.request(method, url, headers=headers, timeout=10, **kwargs)


# ── Properties ────────────────────────────────────────────────────────────────

@pytest.mark.smoke
def test_client_can_create_property(client_token, supabase):
    """Authenticated client inserts a property and it appears in their list."""
    # Get current client's profile id
    profiles = supabase.select("commercial_clients", {"user_id": f"eq.{_get_user_id(client_token)}"})
    if not profiles:
        pytest.skip("No commercial_clients profile found for test client")
    client_id = profiles[0]["id"]

    prop_data = {
        "client_id": client_id,
        "name": f"TEST-{uuid.uuid4().hex[:6]} Property",
        "address": "789 Fixture Ln, Atlanta, GA 30301",
    }
    r = supabase_rest("POST", "properties", client_token, json=prop_data)
    assert r.status_code in (200, 201)
    created = r.json()
    prop_id = created[0]["id"] if isinstance(created, list) else created["id"]

    # Verify it appears in a GET
    get_r = supabase_rest("GET", "properties", client_token,
                           params={"id": f"eq.{prop_id}", "select": "*"})
    assert get_r.status_code == 200
    rows = get_r.json()
    assert len(rows) == 1
    assert rows[0]["name"] == prop_data["name"]
    assert rows[0]["address"] == prop_data["address"]

    # Cleanup
    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id}"})


def test_property_fields_persisted(client_token, supabase):
    profiles = supabase.select("commercial_clients", {"user_id": f"eq.{_get_user_id(client_token)}"})
    if not profiles:
        pytest.skip("No profile for test client")
    client_id = profiles[0]["id"]

    prop_data = {
        "client_id": client_id,
        "name": f"TEST-field-{uuid.uuid4().hex[:4]}",
        "address": "100 Field St, Atlanta, GA 30302",
        "primary_contact_name": "TEST Contact",
        "primary_contact_phone": "5550199999",
        "notes": "TEST fixture notes",
    }
    r = supabase_rest("POST", "properties", client_token, json=prop_data)
    assert r.status_code in (200, 201)
    created = r.json()
    prop_id = created[0]["id"] if isinstance(created, list) else created["id"]

    get_r = supabase_rest("GET", "properties", client_token, params={"id": f"eq.{prop_id}", "select": "*"})
    row = get_r.json()[0]
    assert row["primary_contact_name"] == "TEST Contact"
    assert row["notes"] == "TEST fixture notes"

    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id}"})


# ── Job requests ──────────────────────────────────────────────────────────────

@pytest.mark.smoke
def test_client_can_create_job_request(client_token, supabase):
    profiles = supabase.select("commercial_clients", {"user_id": f"eq.{_get_user_id(client_token)}"})
    if not profiles:
        pytest.skip("No profile for test client")
    client_id = profiles[0]["id"]

    # Create a property first
    prop_r = supabase_rest("POST", "properties", client_token, json={
        "client_id": client_id,
        "name": f"TEST-job-prop-{uuid.uuid4().hex[:4]}",
        "address": "200 Job St, Atlanta, GA 30303",
    })
    prop_id = prop_r.json()[0]["id"] if isinstance(prop_r.json(), list) else prop_r.json()["id"]

    job_data = {
        "property_id": prop_id,
        "description": "TEST job: remove old furniture",
        "preferred_date": "2026-10-01",
        "access_notes": "Gate code 5678",
        "status": "open",
    }
    job_r = supabase_rest("POST", "jobs", client_token, json=job_data)
    assert job_r.status_code in (200, 201)
    job_id = job_r.json()[0]["id"] if isinstance(job_r.json(), list) else job_r.json()["id"]

    # Verify fields persisted
    get_r = supabase_rest("GET", "jobs", client_token, params={"id": f"eq.{job_id}", "select": "*"})
    row = get_r.json()[0]
    assert row["description"] == "TEST job: remove old furniture"
    assert row["status"] == "open"
    assert row["access_notes"] == "Gate code 5678"

    # Cleanup
    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})
    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop_id}"})


def test_unauthenticated_cannot_read_properties():
    url = f"{os.environ['SUPABASE_URL']}/rest/v1/properties"
    r = req.get(url, headers={
        "apikey": os.environ["SUPABASE_ANON_KEY"],
    }, timeout=10)
    # RLS: anon key gets 0 rows, not an error
    assert r.status_code == 200
    assert r.json() == []


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_id(token: str) -> str:
    """Decode the Supabase JWT sub claim without full verification."""
    import base64, json
    payload = token.split(".")[1]
    # Add padding
    payload += "=" * (-len(payload) % 4)
    decoded = json.loads(base64.urlsafe_b64decode(payload))
    return decoded["sub"]
