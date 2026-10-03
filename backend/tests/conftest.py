"""Shared test setup.

The API sets Secure cookies, which is correct for production HTTPS and for
browsers on localhost. requests builds a fresh cookie jar for every call and
that jar refuses Secure cookies on http://, so authenticated tests looked
logged-out. Relax only that check inside the test process.

Environment files are loaded from the repo when /app/... is not present, so the
same suite runs in the deployed test image and in a local checkout.
"""
import http.cookiejar
from pathlib import Path

from dotenv import load_dotenv

_BACKEND = Path(__file__).resolve().parents[1]
_REPO = _BACKEND.parent
for _candidate in (
    Path("/app/frontend/.env"),
    Path("/app/backend/.env"),
    _REPO / "frontend" / ".env",
    _BACKEND / ".env",
):
    if _candidate.is_file():
        load_dotenv(_candidate)


def _allow_secure_over_http(self, cookie, request):
    return True


http.cookiejar.DefaultCookiePolicy.set_ok_secure = _allow_secure_over_http
http.cookiejar.DefaultCookiePolicy.return_ok_secure = _allow_secure_over_http
