"""
Upload session and signed URL lifecycle tests.
"""
import pytest

pytestmark = pytest.mark.integration


def test_create_upload_session_returns_session_id(api):
    r = api.post("/api/create-upload-session", json={})
    assert r.status_code == 200
    body = r.json()
    assert "sessionId" in body
    assert isinstance(body["sessionId"], str)


def test_session_returns_expected_limits(api):
    r = api.post("/api/create-upload-session", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["maxPhotos"] == 10
    assert body["maxFileBytes"] == 10_485_760  # 10 MB
    assert "expiresAt" in body


def test_get_upload_url_returns_signed_url(api, test_upload_session):
    r = api.post("/api/get-upload-url", json={
        "sessionId": test_upload_session,
        "fileName": "photo.jpg",
        "contentType": "image/jpeg",
    })
    assert r.status_code == 200
    body = r.json()
    assert "signedUrl" in body
    assert "storagePath" in body
    assert body["storagePath"].startswith("sessions/")


@pytest.mark.parametrize("bad_ext", ["photo.exe", "malware.pdf", "script.sh", "archive.zip"])
def test_extension_not_allowed_rejected(api, test_upload_session, bad_ext):
    r = api.post("/api/get-upload-url", json={
        "sessionId": test_upload_session,
        "fileName": bad_ext,
    })
    assert r.status_code == 400
    body = r.json()
    assert "error" in body
    assert "not allowed" in body["error"].lower()


def test_content_type_not_allowed_rejected(api, test_upload_session):
    r = api.post("/api/get-upload-url", json={
        "sessionId": test_upload_session,
        "fileName": "file.jpg",
        "contentType": "application/pdf",
    })
    assert r.status_code == 400
    assert "error" in r.json()


def test_missing_session_id_rejected(api):
    r = api.post("/api/get-upload-url", json={"fileName": "photo.jpg"})
    assert r.status_code == 400
    assert "error" in r.json()


def test_missing_file_name_rejected(api, test_upload_session):
    r = api.post("/api/get-upload-url", json={"sessionId": test_upload_session})
    assert r.status_code == 400
    assert "error" in r.json()


def test_invalid_session_id_rejected(api):
    r = api.post("/api/get-upload-url", json={
        "sessionId": "00000000-0000-0000-0000-000000000000",
        "fileName": "photo.jpg",
    })
    assert r.status_code == 400
    assert "error" in r.json()


def test_case_insensitive_extension(api, test_upload_session):
    """JPEG in uppercase should be allowed."""
    r = api.post("/api/get-upload-url", json={
        "sessionId": test_upload_session,
        "fileName": "PHOTO.JPG",
    })
    assert r.status_code == 200


def test_webp_extension_allowed(api, test_upload_session):
    r = api.post("/api/get-upload-url", json={
        "sessionId": test_upload_session,
        "fileName": "photo.webp",
        "contentType": "image/webp",
    })
    assert r.status_code == 200


def test_png_extension_allowed(api, test_upload_session):
    r = api.post("/api/get-upload-url", json={
        "sessionId": test_upload_session,
        "fileName": "photo.png",
        "contentType": "image/png",
    })
    assert r.status_code == 200
