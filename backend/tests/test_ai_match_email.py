"""Tests for POST /api/ai-match/email (new feature).

Validation-only tests avoid consuming rate-limit budget and don't send email.
A single real success test is INTENTIONALLY not included here; rate-limit budget
is limited (3/hour/IP) — main agent already consumed 1 from this pod IP.
The frontend E2E test performs the single authorized real send.
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

VALID_REPORT = {
    "fit_score": 82,
    "headline": "Senior backend engineer with strong distributed systems background",
    "summary": "Strong Python/Go engineer with 8y at high-scale startups.",
    "suggested_roles": ["Senior Backend Engineer", "Platform Engineer"],
    "salary_range_usd": "120k-160k",
    "skills_gap": ["k8s certification", "system design writeup"],
    "next_step": "Book a 20-min intro call.",
}


def _post(payload):
    return requests.post(f"{API}/ai-match/email", json=payload, timeout=15)


def test_invalid_email_format_returns_422():
    r = _post({"email": "not-an-email", "language": "en", "report": VALID_REPORT})
    assert r.status_code == 422, r.text
    assert "email" in r.text.lower()


def test_empty_email_returns_422():
    r = _post({"email": "   ", "language": "en", "report": VALID_REPORT})
    assert r.status_code == 422


def test_missing_report_keys_returns_422():
    incomplete = {k: v for k, v in VALID_REPORT.items() if k != "next_step"}
    r = _post({"email": "info@ashtor.net", "language": "en", "report": incomplete})
    assert r.status_code == 422
    assert "incomplete" in r.text.lower() or "report" in r.text.lower()


def test_invalid_fit_score_returns_422():
    bad = dict(VALID_REPORT, fit_score="not-a-number")
    r = _post({"email": "info@ashtor.net", "language": "en", "report": bad})
    assert r.status_code == 422


def test_empty_report_returns_422():
    r = _post({"email": "info@ashtor.net", "language": "en", "report": {}})
    assert r.status_code == 422


def test_missing_report_field_pydantic_422():
    """Missing 'report' entirely should also be rejected by pydantic."""
    r = _post({"email": "info@ashtor.net", "language": "en"})
    assert r.status_code == 422
