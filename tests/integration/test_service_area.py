"""
Service area configuration: persistence, auth, ZIP normalization, fail-closed behavior.
"""
import pytest

pytestmark = pytest.mark.integration


# ── Persistence ───────────────────────────────────────────────────────────────

@pytest.mark.smoke
def test_config_read_back_matches_saved(api, admin_headers):
    config = {
        "serviceableZips": ["30401", "30402"],
        "excludedZips": ["30499"],
        "unavailableZips": ["30450"],
        "radiusMiles": 20,
        "centerZip": "30401",
    }
    put_r = api.put("/api/admin/service-area", json=config, headers=admin_headers)
    assert put_r.status_code == 200

    get_r = api.get("/api/admin/service-area", headers=admin_headers)
    saved = get_r.json()
    assert set(saved["serviceableZips"]) == {"30401", "30402"}
    assert saved["excludedZips"] == ["30499"]
    assert saved["unavailableZips"] == ["30450"]
    assert saved["radiusMiles"] == 20
    assert saved["centerZip"] == "30401"


def test_config_check_reflects_saved_zips(api, admin_headers):
    """After saving a ZIP as serviceable, the check endpoint must agree."""
    api.put("/api/admin/service-area", json={
        "serviceableZips": ["30303"],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)

    r = api.post("/api/check-service-area", json={"zip": "30303"})
    assert r.status_code == 200
    assert r.json()["serviceable"] is True
    assert r.json()["reason"] == "serviceable"


def test_excluded_zip_check_reflects_saved(api, admin_headers):
    api.put("/api/admin/service-area", json={
        "serviceableZips": [],
        "excludedZips": ["30404"],
        "unavailableZips": [],
    }, headers=admin_headers)

    r = api.post("/api/check-service-area", json={"zip": "30404"})
    assert r.status_code == 200
    assert r.json()["serviceable"] is False
    assert r.json()["reason"] == "excluded"


# ── ZIP normalization ─────────────────────────────────────────────────────────

def test_duplicates_deduplicated(api, admin_headers):
    api.put("/api/admin/service-area", json={
        "serviceableZips": ["30305", "30305", "30306"],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)

    saved = api.get("/api/admin/service-area", headers=admin_headers).json()
    assert saved["serviceableZips"].count("30305") == 1


def test_invalid_zips_silently_dropped(api, admin_headers):
    api.put("/api/admin/service-area", json={
        "serviceableZips": ["30307", "ABCDE", "999", "30307!"],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)

    saved = api.get("/api/admin/service-area", headers=admin_headers).json()
    assert "30307" in saved["serviceableZips"]
    assert all(z == "30307" for z in saved["serviceableZips"])


def test_whitespace_trimmed(api, admin_headers):
    api.put("/api/admin/service-area", json={
        "serviceableZips": [" 30308 "],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)

    saved = api.get("/api/admin/service-area", headers=admin_headers).json()
    assert "30308" in saved["serviceableZips"]
    assert " 30308 " not in saved["serviceableZips"]


# ── Authorization ─────────────────────────────────────────────────────────────

def test_unauthenticated_get_returns_401(api):
    r = api.get("/api/admin/service-area")
    assert r.status_code == 401


def test_unauthenticated_put_returns_401(api):
    r = api.put("/api/admin/service-area", json={"serviceableZips": []})
    assert r.status_code == 401


def test_client_jwt_cannot_read_config(api, client_headers):
    r = api.get("/api/admin/service-area", headers=client_headers)
    assert r.status_code == 401


def test_client_jwt_cannot_write_config(api, client_headers):
    r = api.put("/api/admin/service-area", json={"serviceableZips": []}, headers=client_headers)
    assert r.status_code == 401


# ── Validation ────────────────────────────────────────────────────────────────

def test_invalid_center_zip_returns_400(api, admin_headers):
    r = api.put("/api/admin/service-area", json={
        "serviceableZips": [],
        "excludedZips": [],
        "unavailableZips": [],
        "centerZip": "BADZIP",
    }, headers=admin_headers)
    assert r.status_code == 400
    body = r.json()
    assert "error" in body
    assert "centerZip" in body["error"].lower()


def test_radius_miles_minimum_1(api, admin_headers):
    r = api.put("/api/admin/service-area", json={
        "serviceableZips": [],
        "excludedZips": [],
        "unavailableZips": [],
        "radiusMiles": 0,
    }, headers=admin_headers)
    # Should either reject or coerce to minimum
    if r.status_code == 200:
        saved = api.get("/api/admin/service-area", headers=admin_headers).json()
        assert saved["radiusMiles"] >= 1


# ── Fail-closed behavior ──────────────────────────────────────────────────────

def test_unconfigured_state_allows_booking(api, admin_headers, test_upload_session, test_run_id):
    """
    When all ZIP lists are empty (unconfigured state), booking should still be
    permitted (fail-open for truly unconfigured deployments).
    """
    api.put("/api/admin/service-area", json={
        "serviceableZips": [], "excludedZips": [], "unavailableZips": [],
    }, headers=admin_headers)

    from tests.fixtures.factories import make_booking
    payload = make_booking(test_upload_session, test_run_id)
    r = api.post("/api/create-booking", json=payload)
    # 201 (unconfigured = serviceable) or 200 (idempotent) are acceptable
    assert r.status_code in (200, 201)
