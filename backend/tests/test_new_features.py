"""
Backend tests for new features:
- GitHub OAuth demo-mode endpoints
- social-connect provider validation (github + linkedin)
- Admin CSV leads export
- Admin GitHub profiles listing
"""
import os
import requests
import pytest

from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return s


# ---------- GitHub OAuth (configured with real keys) ----------

class TestGithubOAuth:
    def test_status_configured(self, client):
        r = client.get(f"{API}/auth/github/status")
        assert r.status_code == 200
        assert r.json() == {"configured": True}

    def test_start_redirects_to_github(self, client):
        r = client.get(f"{API}/auth/github/start", allow_redirects=False)
        assert r.status_code == 302
        location = r.headers.get("location", "")
        assert location.startswith("https://github.com/login/oauth/authorize")
        assert "redirect_uri=" in location and "state=" in location

    def test_me_without_cookie_returns_401(self, client):
        s = requests.Session()
        r = s.get(f"{API}/auth/github/me")
        assert r.status_code == 401

    def test_logout_ok(self, client):
        r = client.post(f"{API}/auth/github/logout")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- social-connect provider validation ----------

class TestSocialConnect:
    def test_github_valid(self, client):
        r = client.post(f"{API}/social-connect", json={
            "provider": "github",
            "full_name": "TEST_GH User",
            "profile_url": "https://github.com/testuser",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["provider"] == "github"
        assert "github.com" in data["profile_url"]

    def test_linkedin_valid(self, client):
        r = client.post(f"{API}/social-connect", json={
            "provider": "linkedin",
            "full_name": "TEST_LI User",
            "profile_url": "https://www.linkedin.com/in/testuser",
        })
        assert r.status_code == 200, r.text
        assert r.json()["provider"] == "linkedin"

    def test_mismatched_domain_rejected(self, client):
        r = client.post(f"{API}/social-connect", json={
            "provider": "github",
            "full_name": "TEST_Bad",
            "profile_url": "https://www.linkedin.com/in/foo",
        })
        assert r.status_code == 422

    def test_unknown_provider_rejected(self, client):
        r = client.post(f"{API}/social-connect", json={
            "provider": "twitter",
            "full_name": "TEST_Bad",
            "profile_url": "https://twitter.com/foo",
        })
        # Either pydantic 422 or our 422
        assert r.status_code in (422, 400)


# ---------- Admin: CSV export ----------

class TestAdminCsvExport:
    def test_requires_auth(self):
        s = requests.Session()
        r = s.get(f"{API}/admin/leads/export")
        assert r.status_code == 401

    def test_export_returns_csv(self, admin_client):
        r = admin_client.get(f"{API}/admin/leads/export")
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct
        cd = r.headers.get("content-disposition", "")
        assert "ashtor_leads.csv" in cd
        first_line = r.text.splitlines()[0]
        expected = "created_at,full_name,email,role,skills_or_needs,location,language,status,note"
        assert first_line.strip() == expected
        # Should have at least 1 lead row (seeded)
        assert len(r.text.splitlines()) >= 2


# ---------- Admin: GitHub profiles listing ----------

class TestAdminGithubProfiles:
    def test_requires_auth(self):
        s = requests.Session()
        r = s.get(f"{API}/admin/github-profiles")
        assert r.status_code == 401

    def test_returns_list(self, admin_client):
        r = admin_client.get(f"{API}/admin/github-profiles")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
