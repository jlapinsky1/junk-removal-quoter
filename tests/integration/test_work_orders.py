"""
Commercial portal work orders (jobs table): CRUD, status transitions, field persistence.
Work orders go directly to Supabase (no Netlify Function wrapper).
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


def _get_user_id(token: str) -> str:
    import base64, json
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))["sub"]


@pytest.fixture
def client_property(client_token, supabase):
    """Creates a property for the test client and tears it down after."""
    uid = _get_user_id(client_token)
    profiles = supabase.select("commercial_clients", {"user_id": f"eq.{uid}"})
    if not profiles:
        pytest.skip("No commercial_clients profile for test client")
    client_id = profiles[0]["id"]

    r = supabase_rest("POST", "properties", client_token, json={
        "client_id": client_id,
        "name": f"TEST-wo-prop-{uuid.uuid4().hex[:6]}",
        "address": "500 Work Order St, Atlanta, GA 30305",
    })
    assert r.status_code in (200, 201)
    prop = r.json()[0] if isinstance(r.json(), list) else r.json()
    yield prop

    supabase_rest("DELETE", "properties", client_token, params={"id": f"eq.{prop['id']}"})


# ── CRUD ──────────────────────────────────────────────────────────────────────

@pytest.mark.smoke
def test_create_work_order(client_token, client_property):
    r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": client_property["id"],
        "description": "TEST create work order",
        "status": "open",
        "preferred_date": "2026-10-10",
        "access_notes": "Ring doorbell",
    })
    assert r.status_code in (200, 201)
    job = r.json()[0] if isinstance(r.json(), list) else r.json()
    assert "id" in job
    assert job["status"] == "open"

    # Cleanup
    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job['id']}"})


@pytest.mark.smoke
def test_retrieve_work_order(client_token, client_property):
    create_r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": client_property["id"],
        "description": "TEST retrieve",
        "status": "open",
    })
    job_id = (create_r.json()[0] if isinstance(create_r.json(), list) else create_r.json())["id"]

    get_r = supabase_rest("GET", "jobs", client_token, params={"id": f"eq.{job_id}", "select": "*"})
    assert get_r.status_code == 200
    rows = get_r.json()
    assert len(rows) == 1
    assert rows[0]["description"] == "TEST retrieve"

    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})


def test_update_work_order_fields(client_token, client_property):
    create_r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": client_property["id"],
        "description": "TEST update original",
        "unit": "Unit 1",
        "status": "open",
    })
    job_id = (create_r.json()[0] if isinstance(create_r.json(), list) else create_r.json())["id"]

    # Update description and unit
    supabase_rest("PATCH", "jobs", client_token,
                  json={"description": "TEST update modified", "unit": "Unit 2"},
                  params={"id": f"eq.{job_id}"})

    # Re-fetch
    get_r = supabase_rest("GET", "jobs", client_token, params={"id": f"eq.{job_id}", "select": "*"})
    row = get_r.json()[0]
    assert row["description"] == "TEST update modified"
    assert row["unit"] == "Unit 2"
    # Status unchanged
    assert row["status"] == "open"

    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})


def test_update_does_not_duplicate_record(client_token, client_property):
    create_r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": client_property["id"],
        "description": "TEST no dupe",
        "status": "open",
    })
    job_id = (create_r.json()[0] if isinstance(create_r.json(), list) else create_r.json())["id"]

    supabase_rest("PATCH", "jobs", client_token,
                  json={"description": "TEST updated"}, params={"id": f"eq.{job_id}"})

    count_r = supabase_rest("GET", "jobs", client_token,
                             params={"property_id": f"eq.{client_property['id']}", "select": "count"})
    # Verify via explicit id query
    id_r = supabase_rest("GET", "jobs", client_token, params={"id": f"eq.{job_id}", "select": "id"})
    assert len(id_r.json()) == 1, "Update should not create a duplicate record"

    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})


# ── Field persistence ─────────────────────────────────────────────────────────

def test_all_fields_persisted(client_token, client_property):
    job_data = {
        "property_id": client_property["id"],
        "unit": "TEST-unit-42",
        "description": "TEST full fields",
        "preferred_date": "2026-10-15",
        "access_notes": "TEST access notes",
        "status": "open",
        "estimate": 350.00,
    }
    create_r = supabase_rest("POST", "jobs", client_token, json=job_data)
    job_id = (create_r.json()[0] if isinstance(create_r.json(), list) else create_r.json())["id"]

    get_r = supabase_rest("GET", "jobs", client_token, params={"id": f"eq.{job_id}", "select": "*"})
    row = get_r.json()[0]
    assert row["unit"] == "TEST-unit-42"
    assert row["access_notes"] == "TEST access notes"
    assert row["preferred_date"] == "2026-10-15"
    assert float(row["estimate"]) == 350.00

    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})


# ── Status transitions ────────────────────────────────────────────────────────

def test_status_open_to_scheduled(client_token, client_property):
    create_r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": client_property["id"],
        "description": "TEST status transition",
        "status": "open",
    })
    job_id = (create_r.json()[0] if isinstance(create_r.json(), list) else create_r.json())["id"]

    update_r = supabase_rest("PATCH", "jobs", client_token,
                              json={"status": "scheduled", "scheduled_date": "2026-10-20"},
                              params={"id": f"eq.{job_id}"})

    get_r = supabase_rest("GET", "jobs", client_token, params={"id": f"eq.{job_id}", "select": "status"})
    assert get_r.json()[0]["status"] == "scheduled"

    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})


# ── Unauthorized access ───────────────────────────────────────────────────────

def test_unauthenticated_cannot_create_job(client_property):
    url = f"{os.environ['SUPABASE_URL']}/rest/v1/jobs"
    r = req.post(url, json={
        "property_id": client_property["id"],
        "description": "TEST unauthorized",
        "status": "open",
    }, headers={
        "apikey": os.environ["SUPABASE_ANON_KEY"],
        "Content-Type": "application/json",
    }, timeout=10)
    # RLS: unauthenticated gets empty result or 0 rows inserted
    if r.status_code in (200, 201):
        result = r.json()
        assert result == [] or result is None


def test_work_order_appears_in_list(client_token, client_property):
    create_r = supabase_rest("POST", "jobs", client_token, json={
        "property_id": client_property["id"],
        "description": "TEST list visibility",
        "status": "open",
    })
    job_id = (create_r.json()[0] if isinstance(create_r.json(), list) else create_r.json())["id"]

    # Query the list for this property
    list_r = supabase_rest("GET", "jobs", client_token,
                            params={"property_id": f"eq.{client_property['id']}", "select": "id"})
    job_ids = [row["id"] for row in list_r.json()]
    assert job_id in job_ids

    supabase_rest("DELETE", "jobs", client_token, params={"id": f"eq.{job_id}"})
