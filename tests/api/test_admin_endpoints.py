"""
Admin endpoint authorization and service-area config management.
"""
import pytest

pytestmark = pytest.mark.integration


# ── Authorization ─────────────────────────────────────────────────────────────

def test_get_service_area_unauthenticated_returns_401(api):
    r = api.get("/api/admin/service-area")
    assert r.status_code == 401


def test_put_service_area_unauthenticated_returns_401(api):
    r = api.put("/api/admin/service-area", json={"serviceableZips": ["30301"]})
    assert r.status_code == 401


def test_get_service_area_client_jwt_returns_401(api, client_headers):
    r = api.get("/api/admin/service-area", headers=client_headers)
    assert r.status_code == 401


def test_put_service_area_client_jwt_returns_401(api, client_headers):
    r = api.put("/api/admin/service-area", json={"serviceableZips": []}, headers=client_headers)
    assert r.status_code == 401


def test_get_service_area_admin_returns_200(api, admin_headers):
    r = api.get("/api/admin/service-area", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "serviceableZips" in body
    assert "excludedZips" in body
    assert "unavailableZips" in body
    assert "radiusMiles" in body


# ── Config persistence ────────────────────────────────────────────────────────

@pytest.mark.smoke
def test_admin_put_persists_config(api, admin_headers):
    config = {
        "serviceableZips": ["30301", "30302"],
        "excludedZips": ["30399"],
        "unavailableZips": ["30350"],
        "radiusMiles": 25,
        "centerZip": "30301",
    }
    put_r = api.put("/api/admin/service-area", json=config, headers=admin_headers)
    assert put_r.status_code == 200
    assert put_r.json()["success"] is True

    get_r = api.get("/api/admin/service-area", headers=admin_headers)
    assert get_r.status_code == 200
    saved = get_r.json()
    assert saved["serviceableZips"] == ["30301", "30302"]
    assert saved["excludedZips"] == ["30399"]
    assert saved["unavailableZips"] == ["30350"]
    assert saved["radiusMiles"] == 25
    assert saved["centerZip"] == "30301"


def test_duplicates_removed_on_save(api, admin_headers):
    api.put("/api/admin/service-area", json={
        "serviceableZips": ["30301", "30301", "30302"],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)

    saved = api.get("/api/admin/service-area", headers=admin_headers).json()
    assert saved["serviceableZips"].count("30301") == 1


def test_invalid_zips_silently_dropped(api, admin_headers):
    api.put("/api/admin/service-area", json={
        "serviceableZips": ["30301", "ABCDE", "303", ""],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)

    saved = api.get("/api/admin/service-area", headers=admin_headers).json()
    assert "ABCDE" not in saved["serviceableZips"]
    assert "303" not in saved["serviceableZips"]
    assert "" not in saved["serviceableZips"]
    assert "30301" in saved["serviceableZips"]


def test_whitespace_zips_normalized(api, admin_headers):
    api.put("/api/admin/service-area", json={
        "serviceableZips": [" 30301 "],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)

    saved = api.get("/api/admin/service-area", headers=admin_headers).json()
    assert "30301" in saved["serviceableZips"]
    assert " 30301 " not in saved["serviceableZips"]


def test_invalid_center_zip_returns_400(api, admin_headers):
    r = api.put("/api/admin/service-area", json={
        "serviceableZips": [],
        "excludedZips": [],
        "unavailableZips": [],
        "centerZip": "BADZIP",
    }, headers=admin_headers)
    assert r.status_code == 400
    assert "error" in r.json()


def test_center_zip_is_optional(api, admin_headers):
    r = api.put("/api/admin/service-area", json={
        "serviceableZips": ["30301"],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)
    assert r.status_code == 200


def test_updated_by_set_to_admin_email(api, admin_headers):
    r = api.put("/api/admin/service-area", json={
        "serviceableZips": ["30301"],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)
    assert r.status_code == 200
    config = r.json()["config"]
    assert "@" in config.get("updatedBy", "")


def test_updated_at_is_recent_timestamp(api, admin_headers):
    from datetime import datetime, timezone, timedelta
    r = api.put("/api/admin/service-area", json={
        "serviceableZips": [],
        "excludedZips": [],
        "unavailableZips": [],
    }, headers=admin_headers)
    config = r.json()["config"]
    updated_at = datetime.fromisoformat(config["updatedAt"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    assert now - updated_at < timedelta(seconds=30)


def test_method_not_allowed_returns_405(api, admin_headers):
    r = api.delete("/api/admin/service-area", headers=admin_headers)
    assert r.status_code == 405
