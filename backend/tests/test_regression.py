"""Regression tests after code-review refactor.
Covers OAuth 302 redirects, admin PATCH endpoints, CSV export, and digest send (called once).
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

ADMIN_EMAIL = "admin@ashtor.net"
ADMIN_PASSWORD = "AshtorAdmin#2026"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    # httpOnly cookies should be set
    assert "access_token" in s.cookies, f"access_token cookie missing: {s.cookies}"
    return s


# ---------- Public endpoints ----------
def test_leads_create():
    r = requests.post(f"{BASE_URL}/api/leads", json={
        "role": "founder",
        "full_name": "TEST_Regress User",
        "email": "test_regress@ashtor.net",
        "skills_or_needs": "Python, React, backend regression testing",
        "location": "Remote"
    }, timeout=20)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data.get("ok") is True or "id" in data


def test_stats_network():
    r = requests.get(f"{BASE_URL}/api/stats/network", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d.get("verified_engineers"), int)


def test_github_status_configured():
    r = requests.get(f"{BASE_URL}/api/auth/github/status", timeout=15)
    assert r.status_code == 200
    assert r.json().get("configured") is True


def test_linkedin_status_configured():
    r = requests.get(f"{BASE_URL}/api/auth/linkedin/status", timeout=15)
    assert r.status_code == 200
    assert r.json().get("configured") is True


def test_github_start_302():
    r = requests.get(f"{BASE_URL}/api/auth/github/start", timeout=15, allow_redirects=False)
    assert r.status_code in (302, 307), r.status_code
    loc = r.headers.get("location", "")
    assert "github.com" in loc
    assert "redirect_uri=" in loc
    assert "state=" in loc


def test_linkedin_start_302():
    r = requests.get(f"{BASE_URL}/api/auth/linkedin/start", timeout=15, allow_redirects=False)
    assert r.status_code in (302, 307)
    loc = r.headers.get("location", "")
    assert "linkedin.com" in loc
    assert "state=" in loc


def test_social_connect_linkedin_domain_mismatch():
    r = requests.post(f"{BASE_URL}/api/social-connect", json={
        "provider": "linkedin",
        "name": "TEST_Bad",
        "profile_url": "https://example.com/in/foo"
    }, timeout=15)
    assert r.status_code == 422, r.text


def test_social_connect_github_domain_mismatch():
    r = requests.post(f"{BASE_URL}/api/social-connect", json={
        "provider": "github",
        "name": "TEST_Bad",
        "profile_url": "https://example.com/foo"
    }, timeout=15)
    assert r.status_code == 422


def test_social_connect_linkedin_ok():
    r = requests.post(f"{BASE_URL}/api/social-connect", json={
        "provider": "linkedin",
        "name": "TEST_LI Regress",
        "profile_url": "https://linkedin.com/in/regress"
    }, timeout=15)
    assert r.status_code in (200, 201), r.text


def test_social_connect_github_ok():
    r = requests.post(f"{BASE_URL}/api/social-connect", json={
        "provider": "github",
        "name": "TEST_GH Regress",
        "profile_url": "https://github.com/regress"
    }, timeout=15)
    assert r.status_code in (200, 201)


# ---------- Admin endpoints ----------
def test_admin_leads_list(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/leads", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) or isinstance(data, dict)


def test_admin_social_connections(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/social-connections", timeout=15)
    assert r.status_code == 200


def test_admin_linkedin_profiles(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/linkedin-profiles", timeout=15)
    assert r.status_code == 200


def test_admin_github_profiles(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/github-profiles", timeout=15)
    assert r.status_code == 200


def test_admin_leads_patch_status_and_note(admin_session):
    # find a lead id
    r = admin_session.get(f"{BASE_URL}/api/admin/leads", timeout=15)
    leads = r.json() if isinstance(r.json(), list) else r.json().get("leads", [])
    assert leads, "no leads to patch"
    lead_id = leads[0].get("id") or leads[0].get("_id")
    # patch status
    pr = admin_session.patch(f"{BASE_URL}/api/admin/leads/{lead_id}/status",
                             json={"status": "contacted"}, timeout=15)
    assert pr.status_code in (200, 204), pr.text
    # patch note
    nr = admin_session.patch(f"{BASE_URL}/api/admin/leads/{lead_id}/note",
                             json={"note": "TEST_regress note"}, timeout=15)
    assert nr.status_code in (200, 204), nr.text
    # verify persistence
    r2 = admin_session.get(f"{BASE_URL}/api/admin/leads", timeout=15)
    leads2 = r2.json() if isinstance(r2.json(), list) else r2.json().get("leads", [])
    found = next((l for l in leads2 if (l.get("id") or l.get("_id")) == lead_id), None)
    assert found is not None
    assert found.get("status") == "contacted"
    assert found.get("note") == "TEST_regress note"


def test_admin_leads_export_csv(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/leads/export", timeout=15)
    assert r.status_code == 200
    ctype = r.headers.get("content-type", "")
    assert "csv" in ctype.lower()
    body = r.text
    first_line = body.splitlines()[0] if body else ""
    # must contain expected header columns
    for col in ("name", "email"):
        assert col in first_line.lower()


def test_admin_digest_send_once(admin_session):
    """Sends a REAL email — called exactly once across the run."""
    r = admin_session.post(f"{BASE_URL}/api/admin/digest/send", timeout=30)
    assert r.status_code == 200, r.text
    assert r.json().get("sent") is True
