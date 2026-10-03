import os
import re
import csv
import io
import json
import uuid
import secrets
import asyncio
import logging
import ipaddress
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, urlparse
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import bcrypt
import jwt as pyjwt
import httpx
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from authlib.jose import JsonWebKey, jwt as oidc_jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import StreamingResponse, RedirectResponse, HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel, Field, ConfigDict

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/") or "http://localhost:3000"
# Public origin of this API. When set, emailed approval links and OAuth
# redirect URIs use it instead of the incoming Host header.
BACKEND_URL = os.environ.get("BACKEND_URL", "").strip().rstrip("/")
if BACKEND_URL:
    _backend_parsed = urlparse(BACKEND_URL)
    if _backend_parsed.scheme not in ("http", "https") or not _backend_parsed.netloc or _backend_parsed.username:
        raise RuntimeError("BACKEND_URL must be an absolute http(s) URL without userinfo")
# SameSite policy for auth/session cookies. Use "none" (with HTTPS) when the
# frontend and backend are served from different domains so the browser still
# sends the cookie on cross-site requests; "lax" is fine for same-origin setups.
# Browsers reject SameSite=None without Secure, and every cookie below is Secure.
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax").strip().lower()
if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError("COOKIE_SAMESITE must be one of: lax, strict, none")
# Roles allowed to sign in to the admin panel. "admin" = full access (incl.
# managing users); "editor" = dashboard + approvals, but not user management.
STAFF_ROLES = {"admin", "editor"}
JWT_SECRET = os.environ["JWT_SECRET"]
SESSION_SECRET = os.environ["SESSION_SECRET"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
LINKEDIN_CLIENT_ID = os.environ.get("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.environ.get("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_REDIRECT_URI = os.environ.get("LINKEDIN_REDIRECT_URI", "")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
# "live" calls the email provider. "log" validates the message and does not
# send it — for local runs that have no EMERGENT_EMAIL_KEY. Production leaves
# this unset.
EMAIL_DELIVERY = os.environ.get("EMAIL_DELIVERY", "live").strip().lower()
if EMAIL_DELIVERY not in {"live", "log"}:
    raise RuntimeError("EMAIL_DELIVERY must be live or log")
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
ALERT_EMAIL = os.environ.get("ALERT_EMAIL", "")
APPROVAL_EMAIL = os.environ.get("APPROVAL_EMAIL", "")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

serializer = URLSafeTimedSerializer(SESSION_SECRET)
LINKEDIN_AUTH = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO = "https://api.linkedin.com/v2/userinfo"
LINKEDIN_DISCOVERY = "https://www.linkedin.com/oauth/.well-known/openid-configuration"

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "")
GITHUB_AUTH = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN = "https://github.com/login/oauth/access_token"
GITHUB_USER_API = "https://api.github.com/user"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)


# ---------- email guardrail gate ----------

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _check_email_urls(scan: _EmailScan) -> None:
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        host = urlparse(low).hostname or ""
        local_http = low.startswith("http://") and host == "localhost"
        if not low.startswith("https://") and not local_http:
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")


def _check_email_anchors(scan: _EmailScan) -> None:
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    _check_email_urls(scan)
    _check_email_anchors(scan)


async def send_email(*, to: str, subject: str, html: str, reply_to: str = None):
    _assert_safe_email(subject, html)
    if EMAIL_DELIVERY == "log":
        logger.info("EMAIL_DELIVERY=log; not sending %r to %s", subject, to)
        return "log-only"
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if not reply_to:
        reply_to = (await get_site_settings())["contact_email"]
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")


def _alert_html(title: str, rows: list, cta_url: str = None, cta_label: str = "Open Command Center") -> str:
    cells = "".join(
        f'<tr><td style="padding:6px 12px;font-size:12px;color:#94A3B8;text-transform:uppercase;'
        f'letter-spacing:1px">{escape(k)}</td>'
        f'<td style="padding:6px 12px;font-size:14px;color:#F8FAFC">{escape(str(v))}</td></tr>'
        for k, v in rows
    )
    cta_url = cta_url or f"{FRONTEND_URL}/admin"
    return (
        '<table role="presentation" width="100%" style="background:#07090E;padding:32px 0"><tr><td align="center">'
        '<table role="presentation" width="520" style="background:#111620;border:1px solid #1E293B;'
        'border-radius:12px;padding:28px;font-family:Arial,sans-serif">'
        f'<tr><td style="font-size:11px;color:#10B981;letter-spacing:3px;padding-bottom:8px">ASHTOR.NET // INTAKE SIGNAL</td></tr>'
        f'<tr><td style="font-size:20px;color:#F8FAFC;font-weight:bold;padding-bottom:16px">{escape(title)}</td></tr>'
        f'<tr><td><table role="presentation" width="100%" style="border-top:1px solid #1E293B">{cells}</table></td></tr>'
        f'<tr><td style="padding-top:20px"><a href="{cta_url}" style="display:inline-block;background:#10B981;'
        'color:#07090E;font-size:13px;font-weight:bold;padding:10px 22px;border-radius:999px;'
        f'text-decoration:none">{escape(cta_label)}</a></td></tr>'
        f'<tr><td style="padding-top:20px;font-size:11px;color:#64748B">Sent by {escape(EMAIL_FROM_NAME)}. '
        'We never ask for your password or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )


async def get_site_settings() -> dict:
    """Editable site settings (stored in db.settings, falling back to env)."""
    s = await db.settings.find_one({"key": "site"}, {"_id": 0}) or {}
    return {
        "admin_email": (s.get("admin_email") or APPROVAL_EMAIL or "").strip(),
        "contact_email": (s.get("contact_email") or EMAIL_REPLY_TO or ADMIN_EMAIL or "").strip(),
        "notification_email": (s.get("notification_email") or ALERT_EMAIL or "").strip(),
    }


async def notify_new_lead(lead) -> None:
    to = (await get_site_settings())["notification_email"]
    if not to:
        return
    try:
        await send_email(
            to=to,
            subject=f"New lead: {lead.full_name}",
            html=_alert_html("New lead received", [
                ("Name", lead.full_name), ("Email", lead.email), ("Role", lead.role),
                ("Location", lead.location), ("Stack / Needs", lead.skills_or_needs),
                ("Language", lead.language), ("Received", lead.created_at.isoformat()),
            ]),
        )
    except Exception:
        logger.exception("lead alert email failed")


async def notify_new_connection(conn) -> None:
    to = (await get_site_settings())["notification_email"]
    if not to:
        return
    try:
        await send_email(
            to=to,
            subject=f"New {conn.provider} connection: {conn.full_name or conn.profile_url}",
            html=_alert_html("New social connection", [
                ("Name", conn.full_name or "—"), ("Provider", conn.provider),
                ("Profile URL", conn.profile_url), ("Verified", conn.verified),
                ("Received", conn.created_at.isoformat()),
            ]),
        )
    except Exception:
        logger.exception("connection alert email failed")


# ---------- weekly digest ----------

async def build_digest_rows():
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    all_leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    recent = [l for l in all_leads if l.get("created_at", "") >= week_ago]
    counts = {}
    for l in all_leads:
        s = l.get("status", "new")
        counts[s] = counts.get(s, 0) + 1
    rows = [
        ("New leads (7 days)", len(recent)),
        ("Total leads", len(all_leads)),
        ("Pipeline · New", counts.get("new", 0)),
        ("Pipeline · Contacted", counts.get("contacted", 0)),
        ("Pipeline · Matched", counts.get("matched", 0)),
        ("Pipeline · Hired", counts.get("hired", 0)),
    ]
    for l in recent[:10]:
        rows.append((l.get("full_name", "—"), f"{l.get('role', '')} · {l.get('status', 'new')}"))
    return rows


async def send_weekly_digest():
    to = (await get_site_settings())["notification_email"]
    if not to:
        return None
    rows = await build_digest_rows()
    return await send_email(
        to=to,
        subject="Ashtor.net — weekly lead digest",
        html=_alert_html("Weekly lead digest", rows),
    )


async def _digest_tick() -> None:
    now = datetime.now(timezone.utc)
    state = await db.app_state.find_one({"key": "weekly_digest"})
    if not state:
        await db.app_state.insert_one({"key": "weekly_digest", "last_sent_at": now.isoformat()})
        return
    if (now - datetime.fromisoformat(state["last_sent_at"])) < timedelta(days=7):
        return
    try:
        await send_weekly_digest()
    finally:
        await db.app_state.update_one(
            {"key": "weekly_digest"}, {"$set": {"last_sent_at": now.isoformat()}}
        )


async def weekly_digest_loop():
    while True:
        try:
            await _digest_tick()
        except Exception:
            logger.exception("weekly digest loop error")
        await asyncio.sleep(3600)


# ---------- models ----------

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    full_name: str
    email: str
    skills_or_needs: str
    location: str
    language: str = "en"
    status: str = "new"
    note: str = ""
    approval: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeadCreate(BaseModel):
    role: str
    full_name: str
    email: str
    skills_or_needs: str
    location: str
    language: str = "en"


class SocialConnect(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: str
    profile_url: str
    full_name: str = ""
    verified: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SocialConnectCreate(BaseModel):
    provider: str
    profile_url: str
    full_name: str = ""


class AiMatchRequest(BaseModel):
    profile_text: str
    track: str = "talent"
    language: str = "en"


class LoginIn(BaseModel):
    email: str
    password: str


class ChatIn(BaseModel):
    session_id: str
    message: str
    language: str = "en"


class MatchEmailIn(BaseModel):
    email: str
    language: str = "en"
    report: dict


# ---------- auth helpers ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _origin_allowed(origin: str) -> bool:
    candidate = origin.strip().rstrip("/")
    allowed = {FRONTEND_URL.rstrip("/"), "http://localhost:3000", "http://127.0.0.1:3000"}
    if candidate in allowed:
        return True
    parsed = urlparse(candidate)
    return parsed.scheme in ("http", "https") and parsed.hostname in ("localhost", "127.0.0.1")


def _reject_cross_site_mutation(request: Request) -> None:
    """SameSite=None cookies are sent on cross-site requests. Browsers attach
    Origin on those POSTs; reject anything that is not this site. Clients that
    omit Origin (the test suite, curl) are unchanged.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    origin = request.headers.get("origin")
    if not origin:
        return
    if not _origin_allowed(origin):
        raise HTTPException(status_code=403, detail="Cross-site request blocked")


def _set_cookie(response: Response, key: str, value: str, *, max_age: int, path: str = "/") -> None:
    response.set_cookie(
        key, value, max_age=max_age, path=path,
        httponly=True, secure=True, samesite=COOKIE_SAMESITE,
    )


def _clear_cookie(response: Response, key: str, *, path: str = "/") -> None:
    # Secure and SameSite must match the cookie that was set, or the browser
    # keeps the original (logout silently fails when SameSite=None).
    response.delete_cookie(
        key, path=path, httponly=True, secure=True, samesite=COOKIE_SAMESITE,
    )


async def get_current_admin(request: Request):
    token = request.cookies.get("access_token")
    from_cookie = bool(token)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if from_cookie:
        _reject_cross_site_mutation(request)
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"email": payload.get("email")})
    if not user or user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=401, detail="Not authorized")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}


async def get_current_owner(admin=Depends(get_current_admin)):
    if admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return admin


async def seed_admin():
    # Ensure the environment-configured owner account always exists and stays an
    # admin (so it cannot be demoted into a lockout). Password is applied only
    # when the account is created. Later changes from the Users tab must survive
    # a restart; ADMIN_PASSWORD is not reapplied on every boot.
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return
    if existing.get("role") != "admin":
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"role": "admin"}})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.leads.create_index("access_token", sparse=True)
    await db.login_attempts.create_index("identifier")
    await db.linkedin_profiles.create_index("sub", unique=True)
    await db.github_profiles.create_index("github_id", unique=True)
    await seed_admin()
    asyncio.create_task(weekly_digest_loop())
    try:
        await init_storage()
        logger.info("Object storage initialized")
    except Exception:
        logger.exception("Object storage init failed")


# ---------- public endpoints ----------

@api_router.get("/")
async def root():
    return {"message": "ashtor.net API operational"}


NETWORK_BASE_COUNT = 2417


@api_router.get("/stats/network")
async def network_stats():
    li = await db.linkedin_profiles.count_documents({})
    gh = await db.github_profiles.count_documents({})
    sc = await db.social_connections.count_documents({})
    return {"verified_engineers": NETWORK_BASE_COUNT + li + gh + sc}


@api_router.post("/leads", response_model=Lead)
async def create_lead(input: LeadCreate, request: Request):
    lead = Lead(**input.model_dump())
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)
    asyncio.create_task(notify_new_lead(lead))
    asyncio.create_task(notify_approval_request(lead, _request_base(request)))
    return lead


# ---------- manual approval workflow ----------

_APPROVAL_ROWS = (("Name", "full_name"), ("Email", "email"), ("Role", "role"),
                  ("Stack / Needs", "skills_or_needs"), ("Location", "location"), ("Language", "language"))


def _approval_html(lead: dict, approve_url: str, reject_url: str) -> str:
    cells = "".join(
        f'<tr><td style="padding:6px 12px;font-size:12px;color:#94A3B8;text-transform:uppercase;'
        f'letter-spacing:1px">{escape(label)}</td>'
        f'<td style="padding:6px 12px;font-size:14px;color:#F8FAFC">{escape(str(lead.get(key, "—")))}</td></tr>'
        for label, key in _APPROVAL_ROWS
    )
    return (
        '<div style="background:#07090E;padding:32px;font-family:Arial,Helvetica,sans-serif">'
        '<table style="max-width:560px;margin:auto;background:#111620;border:1px solid #1E293B;'
        'border-radius:12px;padding:24px;width:100%">'
        '<tr><td colspan="2" style="padding:12px;font-size:18px;font-weight:bold;color:#F8FAFC">'
        'New signup awaiting approval</td></tr>'
        f'{cells}'
        '<tr><td colspan="2" style="padding:20px 12px 6px">'
        f'<a href="{approve_url}" style="display:inline-block;background:#10B981;color:#07090E;font-size:13px;'
        'font-weight:bold;padding:10px 22px;border-radius:999px;text-decoration:none;margin-right:10px">Approve access</a>'
        f'<a href="{reject_url}" style="display:inline-block;background:#334155;color:#F8FAFC;font-size:13px;'
        'font-weight:bold;padding:10px 22px;border-radius:999px;text-decoration:none">Reject</a>'
        '</td></tr></table></div>'
    )


async def notify_approval_request(lead: Lead, base: str) -> None:
    to = (await get_site_settings())["admin_email"]
    if not to:
        return
    try:
        approve_url = f"{base}/api/leads/approval?token={signed({'lead_id': lead.id, 'action': 'approve'})}"
        reject_url = f"{base}/api/leads/approval?token={signed({'lead_id': lead.id, 'action': 'reject'})}"
        await send_email(
            to=to,
            subject=f"Approval needed: {lead.full_name} ({lead.role})",
            html=_approval_html(lead.model_dump(), approve_url, reject_url),
        )
    except Exception:
        logger.exception("approval request email failed")


async def _send_approved_email(lead: dict, welcome_url: str) -> None:
    es = lead.get("language") == "es"
    await send_email(
        to=lead["email"],
        subject="Tu acceso a Ashtor está aprobado" if es else "Your Ashtor access is approved",
        html=_alert_html(
            "Acceso aprobado" if es else "Access approved",
            [("Nombre" if es else "Name", lead.get("full_name", "—")),
             ("Estado" if es else "Status", "APROBADO" if es else "APPROVED"),
             ("Perfil" if es else "Profile", lead.get("role", "—"))],
            cta_url=welcome_url,
            cta_label="Abrir mi portal de acceso" if es else "Open my access portal",
        ),
    )


async def _send_rejected_email(lead: dict, base: str) -> None:
    es = lead.get("language") == "es"
    msg = ("Por ahora no podemos continuar con tu registro. Guardaremos tu perfil y te contactaremos "
           "si se abre un match adecuado.") if es else (
           "We can't move forward with your signup right now. We'll keep your profile on file and reach "
           "out if a suitable match opens up.")
    await send_email(
        to=lead["email"],
        subject="Sobre tu registro en Ashtor" if es else "About your Ashtor signup",
        html=_alert_html(
            "Gracias por tu interés" if es else "Thanks for your interest",
            [("Nombre" if es else "Name", lead.get("full_name", "—")), ("Mensaje" if es else "Message", msg)],
            cta_url=f"{base}/",
            cta_label="Volver al sitio" if es else "Back to the site",
        ),
    )


def _site_base() -> str:
    """Origin of the public site. Welcome links must not use the API host."""
    return FRONTEND_URL.rstrip("/")


async def _apply_approval(lead: dict, action: str) -> dict:
    # The pages a person opens live on the frontend. The API only serves
    # /api/welcome/{token} as JSON, so emailed links must not use the API host.
    site = _site_base()
    if action == "approve":
        access_token = secrets.token_urlsafe(24)
        await db.leads.update_one({"id": lead["id"]}, {"$set": {
            "approval": "approved",
            "access_token": access_token,
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }})
        try:
            await _send_approved_email(lead, f"{site}/welcome/{access_token}")
        except Exception:
            logger.exception("approval confirmation email failed")
        return {"approval": "approved", "access_token": access_token}
    await db.leads.update_one({"id": lead["id"]}, {"$set": {"approval": "rejected"}})
    try:
        await _send_rejected_email(lead, site)
    except Exception:
        logger.exception("rejection email failed")
    return {"approval": "rejected"}


_APPROVAL_PAGE = (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex">'
    '<title>ashtor.net</title></head>'
    '<body style="background:#07090E;color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;'
    'display:flex;align-items:center;justify-content:center;height:100vh;margin:0">'
    '<div style="text-align:center;border:1px solid #1E293B;background:#111620;border-radius:14px;'
    'padding:40px 48px;max-width:420px">'
    '<div style="font-size:34px;margin-bottom:12px;color:{color}">{icon}</div>'
    '<h1 style="font-size:20px;margin:0 0 8px">{title}</h1>'
    '<p style="color:#94A3B8;font-size:14px;margin:0;line-height:1.6">{sub}</p>'
    '</div></body></html>'
)


@api_router.get("/leads/approval")
async def approval_via_email(token: str):
    try:
        payload = unsigned(token, max_age=14 * 86400)
    except Exception:
        raise HTTPException(400, "Invalid or expired approval link")
    action = payload.get("action")
    lead_id = payload.get("lead_id")
    if action not in ("approve", "reject") or not lead_id:
        raise HTTPException(400, "Invalid or expired approval link")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    name = escape(lead.get("full_name", ""))
    current = lead.get("approval", "pending")
    if current != "pending":
        return HTMLResponse(_APPROVAL_PAGE.format(
            color="#94A3B8", icon="&#8505;", title=f"Already {current}",
            sub=f"{name} was already {current}. No new emails were sent."))
    result = await _apply_approval(lead, action)
    if result["approval"] == "approved":
        return HTMLResponse(_APPROVAL_PAGE.format(
            color="#10B981", icon="&#10003;", title="Access approved",
            sub=f"{name} has been approved. A confirmation email with their unique access link is on its way."))
    return HTMLResponse(_APPROVAL_PAGE.format(
        color="#F87171", icon="&#10007;", title="Signup rejected",
        sub=f"{name} has been rejected. A polite notice email was sent."))


class LeadApprovalIn(BaseModel):
    action: str


@api_router.patch("/admin/leads/{lead_id}/approval")
async def admin_set_approval(lead_id: str, input: LeadApprovalIn, admin=Depends(get_current_admin)):
    if input.action not in ("approve", "reject"):
        raise HTTPException(422, "Invalid action")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    if lead.get("approval", "pending") != "pending":
        raise HTTPException(409, "Lead already processed")
    result = await _apply_approval(lead, input.action)
    return {"id": lead_id, **result}


def _profile_payload(lead: dict) -> dict:
    return {
        "member_id": lead["id"][:8].upper(),
        "full_name": lead["full_name"],
        "email": lead["email"],
        "role": lead["role"],
        "skills_or_needs": lead["skills_or_needs"],
        "location": lead["location"],
        "language": lead.get("language", "en"),
        "approval": lead.get("approval"),
        "approved_at": lead.get("approved_at"),
        "created_at": lead.get("created_at"),
        "has_cv": bool(lead.get("cv_file_id")),
    }


async def _approved_lead_or_404(access_token: str) -> dict:
    # tokens are secrets.token_urlsafe(24) (~32 chars). Reject anything shorter
    # before hitting the database.
    if not access_token or len(access_token) < 20:
        raise HTTPException(404, "Invalid access link")
    lead = await db.leads.find_one({"access_token": access_token, "approval": "approved"}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Invalid access link")
    return lead


@api_router.get("/welcome/{access_token}")
async def welcome_info(access_token: str):
    lead = await _approved_lead_or_404(access_token)
    return _profile_payload(lead)


@api_router.get("/profile/{access_token}")
async def public_profile(access_token: str):
    lead = await _approved_lead_or_404(access_token)
    return _profile_payload(lead)


class WelcomeUpdateIn(BaseModel):
    skills_or_needs: str = None
    location: str = None


@api_router.patch("/welcome/{access_token}")
async def welcome_update(access_token: str, input: WelcomeUpdateIn):
    lead = await _approved_lead_or_404(access_token)
    updates = {}
    if input.skills_or_needs is not None:
        v = input.skills_or_needs.strip()
        if not v or len(v) > 500:
            raise HTTPException(422, "Invalid skills value")
        updates["skills_or_needs"] = v
    if input.location is not None:
        v = input.location.strip()
        if not v or len(v) > 100:
            raise HTTPException(422, "Invalid location value")
        updates["location"] = v
    if not updates:
        raise HTTPException(422, "Nothing to update")
    await db.leads.update_one({"id": lead["id"]}, {"$set": updates})
    return _profile_payload({**lead, **updates})


PROVIDER_DOMAINS = {"linkedin": "linkedin.com", "github": "github.com"}


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_REPORT_KEYS = ("fit_score", "headline", "summary", "suggested_roles", "salary_range_usd", "skills_gap", "next_step")


def _clip(value, limit: int = 400) -> str:
    return str(value)[:limit]


async def _check_match_email_rate(ident: str, now: datetime) -> None:
    rec = await db.email_requests.find_one({"identifier": ident})
    if not rec:
        return
    first = datetime.fromisoformat(rec["first_at"])
    if (now - first) >= timedelta(hours=1):
        await db.email_requests.delete_one({"identifier": ident})
        return
    if rec.get("count", 0) >= 3:
        raise HTTPException(429, "Too many report emails. Try again later.")


@api_router.post("/ai-match/email")
async def email_match_report(input: MatchEmailIn, request: Request):
    email = input.email.strip()
    if not _EMAIL_RE.match(email):
        raise HTTPException(422, "Invalid email address")
    r = input.report
    if not all(k in r for k in _REPORT_KEYS):
        raise HTTPException(422, "Incomplete report")
    try:
        fit_score = max(0, min(100, int(r["fit_score"])))
    except (TypeError, ValueError):
        raise HTTPException(422, "Invalid fit score")

    ident_ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                or (request.client.host if request.client else "unknown"))
    ident = f"match_email:{ident_ip}"
    now = datetime.now(timezone.utc)
    await _check_match_email_rate(ident, now)

    es = input.language == "es"
    roles = r["suggested_roles"] if isinstance(r["suggested_roles"], list) else [r["suggested_roles"]]
    gaps = r["skills_gap"] if isinstance(r["skills_gap"], list) else [r["skills_gap"]]
    rows = [
        ("Fit Score", f"{fit_score}/100"),
        ("Titular" if es else "Headline", _clip(r["headline"], 150)),
        ("Resumen" if es else "Summary", _clip(r["summary"])),
        ("Roles sugeridos" if es else "Suggested Roles", _clip(", ".join(map(str, roles[:5])))),
        ("Banda salarial (USD)" if es else "Salary Band (USD)", _clip(r["salary_range_usd"], 60)),
        ("Señales a reforzar" if es else "Signals to Strengthen", _clip(", ".join(map(str, gaps[:5])))),
        ("Siguiente paso" if es else "Next Step", _clip(r["next_step"])),
    ]
    await send_email(
        to=email,
        subject="Tu informe AI Match — Ashtor.net" if es else "Your AI Match Report — Ashtor.net",
        html=_alert_html(
            "Informe AI Match" if es else "AI Match Report",
            rows,
            cta_url=f"{_site_base()}/#contact",
            cta_label="Aplica ahora" if es else "Apply now",
        ),
    )
    await db.email_requests.update_one(
        {"identifier": ident},
        {"$inc": {"count": 1}, "$setOnInsert": {"first_at": now.isoformat()}},
        upsert=True,
    )
    return {"sent": True}


@api_router.post("/social-connect", response_model=SocialConnect)
async def create_social_connect(input: SocialConnectCreate):
    domain = PROVIDER_DOMAINS.get(input.provider)
    if not domain or domain not in input.profile_url:
        raise HTTPException(status_code=422, detail="Invalid profile URL for provider")
    conn = SocialConnect(**input.model_dump())
    doc = conn.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.social_connections.insert_one(doc)
    asyncio.create_task(notify_new_connection(conn))
    return conn


# ---------- admin auth ----------

@api_router.post("/auth/login")
async def login(input: LoginIn, request: Request, response: Response):
    email = input.email.lower().strip()
    ident = f"{request.client.host if request.client else 'unknown'}:{email}"
    now = datetime.now(timezone.utc)
    rec = await db.login_attempts.find_one({"identifier": ident})
    if rec and rec.get("count", 0) >= 5:
        first = datetime.fromisoformat(rec["first_at"])
        if (now - first) < timedelta(minutes=15):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        await db.login_attempts.delete_one({"identifier": ident})
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$setOnInsert": {"first_at": now.isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.login_attempts.delete_one({"identifier": ident})
    user_id = str(user["_id"])
    _set_cookie(response, "access_token", create_access_token(user_id, email), max_age=900)
    _set_cookie(response, "refresh_token", create_refresh_token(user_id), max_age=604800)
    return {"id": user_id, "email": email, "name": user.get("name", "Admin"), "role": user["role"]}


@api_router.get("/auth/me")
async def auth_me(admin=Depends(get_current_admin)):
    return admin


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    _reject_cross_site_mutation(request)
    _clear_cookie(response, "access_token")
    _clear_cookie(response, "refresh_token")
    return {"ok": True}


@api_router.get("/admin/leads")
async def admin_leads(admin=Depends(get_current_admin)):
    return await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/admin/social-connections")
async def admin_social(admin=Depends(get_current_admin)):
    return await db.social_connections.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/admin/linkedin-profiles")
async def admin_linkedin(admin=Depends(get_current_admin)):
    return await db.linkedin_profiles.find({}, {"_id": 0}).sort("verified_at", -1).to_list(1000)


@api_router.get("/admin/github-profiles")
async def admin_github(admin=Depends(get_current_admin)):
    return await db.github_profiles.find({}, {"_id": 0}).sort("verified_at", -1).to_list(1000)


# ---------- admin user management (owner only) ----------

USER_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MAX_PASSWORD_BYTES = 72


def _validate_new_password(password: str) -> None:
    # bcrypt only uses the first 72 bytes and raises on longer input.
    if len(password) < 8 or len(password.encode("utf-8")) > _MAX_PASSWORD_BYTES:
        raise HTTPException(422, "Password must be between 8 and 72 bytes")


def _public_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "admin"),
        "created_at": u.get("created_at"),
    }


class UserCreateIn(BaseModel):
    email: str
    password: str
    name: str = "Admin"
    role: str = "admin"


class UserUpdateIn(BaseModel):
    email: str = None
    password: str = None
    name: str = None
    role: str = None


@api_router.get("/admin/users")
async def admin_list_users(owner=Depends(get_current_owner)):
    users = await db.users.find({}).sort("created_at", 1).to_list(1000)
    return [_public_user(u) for u in users]


@api_router.post("/admin/users")
async def admin_create_user(input: UserCreateIn, owner=Depends(get_current_owner)):
    email = input.email.lower().strip()
    if len(email) > 254 or not USER_EMAIL_RE.match(email):
        raise HTTPException(422, "Invalid email")
    _validate_new_password(input.password)
    if input.role not in STAFF_ROLES:
        raise HTTPException(422, "Invalid role")
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "A user with that email already exists")
    doc = {
        "email": email,
        "password_hash": hash_password(input.password),
        "name": (input.name or "").strip() or "Admin",
        "role": input.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _public_user(doc)


def _parse_object_id(user_id: str) -> ObjectId:
    try:
        return ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(404, "User not found")


@api_router.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, input: UserUpdateIn, owner=Depends(get_current_owner)):
    oid = _parse_object_id(user_id)
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(404, "User not found")
    updates = {}
    if input.email is not None:
        email = input.email.lower().strip()
        if len(email) > 254 or not USER_EMAIL_RE.match(email):
            raise HTTPException(422, "Invalid email")
        if await db.users.find_one({"email": email, "_id": {"$ne": oid}}):
            raise HTTPException(409, "A user with that email already exists")
        updates["email"] = email
    if input.name is not None:
        updates["name"] = input.name.strip() or "Admin"
    if input.role is not None:
        if input.role not in STAFF_ROLES:
            raise HTTPException(422, "Invalid role")
        if user.get("role") == "admin" and input.role != "admin":
            if await db.users.count_documents({"role": "admin"}) <= 1:
                raise HTTPException(409, "At least one admin must remain")
        updates["role"] = input.role
    if input.password is not None:
        _validate_new_password(input.password)
        updates["password_hash"] = hash_password(input.password)
    if updates:
        await db.users.update_one({"_id": oid}, {"$set": updates})
    return _public_user(await db.users.find_one({"_id": oid}))


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, owner=Depends(get_current_owner)):
    oid = _parse_object_id(user_id)
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(404, "User not found")
    if user["email"] == owner["email"]:
        raise HTTPException(409, "You cannot delete your own account")
    if user.get("role") == "admin" and await db.users.count_documents({"role": "admin"}) <= 1:
        raise HTTPException(409, "At least one admin must remain")
    await db.users.delete_one({"_id": oid})
    return {"ok": True}


# ---------- site settings (editable emails) ----------

SETTINGS_KEYS = ("admin_email", "contact_email", "notification_email")


class SettingsUpdateIn(BaseModel):
    admin_email: str = None
    contact_email: str = None
    notification_email: str = None


@api_router.get("/settings/public")
async def public_settings():
    return {"contact_email": (await get_site_settings())["contact_email"]}


@api_router.get("/admin/settings")
async def admin_get_settings(owner=Depends(get_current_owner)):
    return await get_site_settings()


@api_router.patch("/admin/settings")
async def admin_update_settings(input: SettingsUpdateIn, owner=Depends(get_current_owner)):
    updates = {}
    for key in SETTINGS_KEYS:
        val = getattr(input, key)
        if val is not None:
            val = val.strip().lower()
            if val and (len(val) > 254 or not USER_EMAIL_RE.match(val)):
                raise HTTPException(422, f"Invalid email for {key}")
            updates[key] = val
    if updates:
        await db.settings.update_one({"key": "site"}, {"$set": updates}, upsert=True)
    return await get_site_settings()


@api_router.post("/admin/digest/send")
async def admin_send_digest(admin=Depends(get_current_admin)):
    email_id = await send_weekly_digest()
    if email_id is None:
        raise HTTPException(503, "Alert email not configured")
    await db.app_state.update_one(
        {"key": "weekly_digest"},
        {"$set": {"last_sent_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"sent": True, "email_id": email_id}


@api_router.get("/admin/leads/export")
async def admin_export_leads(admin=Depends(get_current_admin)):
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["created_at", "full_name", "email", "role", "skills_or_needs",
                     "location", "language", "status", "approval", "note"])
    for l in leads:
        writer.writerow([
            l.get("created_at", ""), l.get("full_name", ""), l.get("email", ""),
            l.get("role", ""), l.get("skills_or_needs", ""), l.get("location", ""),
            l.get("language", ""), l.get("status", "new"), l.get("approval", "pending"), l.get("note", ""),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=ashtor_leads.csv"},
    )


class LeadStatusIn(BaseModel):
    status: str


ALLOWED_LEAD_STATUSES = {"new", "contacted", "matched", "hired"}


@api_router.patch("/admin/leads/{lead_id}/status")
async def admin_set_lead_status(lead_id: str, input: LeadStatusIn, admin=Depends(get_current_admin)):
    if input.status not in ALLOWED_LEAD_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status")
    res = await db.leads.update_one({"id": lead_id}, {"$set": {"status": input.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"id": lead_id, "status": input.status}


class LeadNoteIn(BaseModel):
    note: str


@api_router.patch("/admin/leads/{lead_id}/note")
async def admin_set_lead_note(lead_id: str, input: LeadNoteIn, admin=Depends(get_current_admin)):
    res = await db.leads.update_one({"id": lead_id}, {"$set": {"note": input.note}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"id": lead_id, "note": input.note}


# ---------- LinkedIn OIDC ----------

def linkedin_configured() -> bool:
    return bool(LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET)


def signed(value: dict) -> str:
    return serializer.dumps(value)


def unsigned(value: str, max_age: int = 600) -> dict:
    try:
        return serializer.loads(value, max_age=max_age)
    except (BadSignature, SignatureExpired):
        raise HTTPException(400, "Invalid or expired OAuth transaction")


@api_router.get("/auth/linkedin/status")
async def linkedin_status():
    return {"configured": linkedin_configured()}


@api_router.get("/auth/linkedin/start")
async def linkedin_start():
    if not linkedin_configured():
        raise HTTPException(503, "LinkedIn OAuth not configured")
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    query = urlencode({
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": LINKEDIN_REDIRECT_URI,
        "scope": "openid profile email",
        "state": state,
        "nonce": nonce,
    })
    response = RedirectResponse(f"{LINKEDIN_AUTH}?{query}", status_code=302)
    _set_cookie(response, "linkedin_oauth", signed({"state": state, "nonce": nonce}),
                max_age=600, path="/api/auth/linkedin")
    return response


async def _linkedin_fetch_verified_profile(code: str, tx: dict) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as http:
        token_res = await http.post(LINKEDIN_TOKEN, data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": LINKEDIN_CLIENT_ID,
            "client_secret": LINKEDIN_CLIENT_SECRET,
            "redirect_uri": LINKEDIN_REDIRECT_URI,
        })
        if token_res.is_error:
            raise HTTPException(502, "LinkedIn token exchange failed")
        token = token_res.json()

        info_res = await http.get(LINKEDIN_USERINFO, headers={"Authorization": f"Bearer {token['access_token']}"})
        if info_res.is_error:
            raise HTTPException(502, "LinkedIn userinfo request failed")
        profile = info_res.json()

        id_token = token.get("id_token")
        if not id_token:
            raise HTTPException(502, "LinkedIn did not return an ID token")
        discovery = (await http.get(LINKEDIN_DISCOVERY)).json()
        jwks = (await http.get(discovery["jwks_uri"])).json()
        claims = oidc_jwt.decode(
            id_token, JsonWebKey.import_key_set(jwks),
            claims_options={
                "iss": {"essential": True, "value": "https://www.linkedin.com"},
                "aud": {"essential": True, "value": LINKEDIN_CLIENT_ID},
                "exp": {"essential": True}, "iat": {"essential": True}, "sub": {"essential": True},
            },
        )
        claims.validate()
        if not secrets.compare_digest(claims["sub"], profile.get("sub", "")):
            raise HTTPException(502, "LinkedIn subject mismatch")
        if "nonce" in claims and not secrets.compare_digest(claims["nonce"], tx["nonce"]):
            raise HTTPException(502, "OIDC nonce mismatch")
    return profile


@api_router.get("/auth/linkedin/callback")
async def linkedin_callback(request: Request, code: str = None, state: str = None, error: str = None):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/?linkedin_error=denied")
    if not code or not state:
        raise HTTPException(400, "Missing OAuth code or state")
    raw_tx = request.cookies.get("linkedin_oauth")
    if not raw_tx:
        raise HTTPException(400, "Missing OAuth transaction cookie")
    tx = unsigned(raw_tx)
    if not secrets.compare_digest(state, tx["state"]):
        raise HTTPException(400, "OAuth state mismatch")

    profile = await _linkedin_fetch_verified_profile(code, tx)

    now = datetime.now(timezone.utc).isoformat()
    await db.linkedin_profiles.update_one(
        {"sub": profile["sub"]},
        {"$set": {
            "sub": profile["sub"],
            "name": profile.get("name"),
            "given_name": profile.get("given_name"),
            "family_name": profile.get("family_name"),
            "email": profile.get("email"),
            "email_verified": profile.get("email_verified"),
            "picture": profile.get("picture"),
            "locale": profile.get("locale"),
            "verified_at": now,
        }, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    response = RedirectResponse(f"{FRONTEND_URL}/?linkedin=connected", status_code=302)
    _clear_cookie(response, "linkedin_oauth", path="/api/auth/linkedin")
    _set_cookie(response, "app_session", signed({"sub": profile["sub"]}), max_age=86400)
    return response


@api_router.get("/auth/linkedin/me")
async def linkedin_me(request: Request):
    cookie = request.cookies.get("app_session")
    if not cookie:
        raise HTTPException(401, "Not signed in")
    session = unsigned(cookie, max_age=86400)
    profile = await db.linkedin_profiles.find_one({"sub": session["sub"]}, {"_id": 0})
    if not profile:
        raise HTTPException(401, "Session user not found")
    return profile


@api_router.post("/auth/linkedin/logout")
async def linkedin_logout():
    response = Response(content='{"ok": true}', media_type="application/json")
    _clear_cookie(response, "app_session")
    return response


# ---------- GitHub OAuth ----------

def github_configured() -> bool:
    return bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)


_HOST_RE = re.compile(r"^[A-Za-z0-9.\-:\[\]]+$")


def _request_base(request: Request) -> str:
    """Public origin of this API.

    Prefer BACKEND_URL. Otherwise use the Host header the proxy assigned.
    Do not read X-Forwarded-Host: a lead submission can set it and the approval
    email would hand the signed token to that host.
    """
    if BACKEND_URL:
        return BACKEND_URL
    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "http")
    proto = proto.split(",")[0].strip().lower()
    if proto not in ("http", "https"):
        proto = "http"
    host = (request.headers.get("host") or request.url.netloc or "").split(",")[0].strip()
    if not _HOST_RE.fullmatch(host):
        host = request.url.netloc
    return f"{proto}://{host}"


async def _github_fetch_profile(code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as http:
        token_res = await http.post(GITHUB_TOKEN, data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }, headers={"Accept": "application/json"})
        if token_res.is_error:
            raise HTTPException(502, "GitHub token exchange failed")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise HTTPException(502, "GitHub did not return an access token")

        user_res = await http.get(GITHUB_USER_API, headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        if user_res.is_error:
            raise HTTPException(502, "GitHub user request failed")
        return user_res.json()


@api_router.get("/auth/github/status")
async def github_status():
    return {"configured": github_configured()}


@api_router.get("/auth/github/start")
async def github_start(request: Request):
    if not github_configured():
        raise HTTPException(503, "GitHub OAuth not configured")
    state = secrets.token_urlsafe(32)
    redirect_uri = f"{_request_base(request)}/api/auth/github/callback"
    query = urlencode({
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "read:user",
        "state": state,
    })
    response = RedirectResponse(f"{GITHUB_AUTH}?{query}", status_code=302)
    _set_cookie(response, "github_oauth", signed({"state": state, "redirect_uri": redirect_uri}),
                max_age=600, path="/api/auth/github")
    return response


@api_router.get("/auth/github/callback")
async def github_callback(request: Request, code: str = None, state: str = None, error: str = None):
    if error:
        return RedirectResponse(f"{_request_base(request)}/?github_error=denied")
    if not code or not state:
        raise HTTPException(400, "Missing OAuth code or state")
    raw_tx = request.cookies.get("github_oauth")
    if not raw_tx:
        raise HTTPException(400, "Missing OAuth transaction cookie")
    tx = unsigned(raw_tx)
    if not secrets.compare_digest(state, tx["state"]):
        raise HTTPException(400, "OAuth state mismatch")

    profile = await _github_fetch_profile(code, tx.get("redirect_uri", GITHUB_REDIRECT_URI))

    github_id = str(profile["id"])
    now = datetime.now(timezone.utc).isoformat()
    await db.github_profiles.update_one(
        {"github_id": github_id},
        {"$set": {
            "github_id": github_id,
            "username": profile.get("login"),
            "name": profile.get("name"),
            "avatar_url": profile.get("avatar_url"),
            "profile_url": profile.get("html_url"),
            "public_repos": profile.get("public_repos", 0),
            "followers": profile.get("followers", 0),
            "bio": profile.get("bio"),
            "verified_at": now,
        }, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    response = RedirectResponse(f"{_request_base(request)}/?github=connected", status_code=302)
    _clear_cookie(response, "github_oauth", path="/api/auth/github")
    _set_cookie(response, "github_session", signed({"gid": github_id}), max_age=86400)
    return response


@api_router.get("/auth/github/me")
async def github_me(request: Request):
    cookie = request.cookies.get("github_session")
    if not cookie:
        raise HTTPException(401, "Not signed in")
    session = unsigned(cookie, max_age=86400)
    profile = await db.github_profiles.find_one({"github_id": session["gid"]}, {"_id": 0})
    if not profile:
        raise HTTPException(401, "Session user not found")
    return profile


@api_router.post("/auth/github/logout")
async def github_logout():
    response = Response(content='{"ok": true}', media_type="application/json")
    _clear_cookie(response, "github_session")
    return response


# ---------- object storage (Emergent) ----------

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
STORAGE_APP = "ashtor"
MAX_FILE_SIZE = 8 * 1024 * 1024
CV_TYPES = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ATTACH_TYPES = {**CV_TYPES, "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
                "txt": "text/plain", "csv": "text/csv"}

_storage_key = None


async def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]})
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = await init_storage()
    async with httpx.AsyncClient(timeout=120) as http:
        resp = await http.put(f"{STORAGE_URL}/objects/{path}",
                              headers={"X-Storage-Key": key, "Content-Type": content_type}, content=data)
        if resp.status_code == 404:
            key = await init_storage(force=True)
            resp = await http.put(f"{STORAGE_URL}/objects/{path}",
                                  headers={"X-Storage-Key": key, "Content-Type": content_type}, content=data)
    if resp.is_error:
        logger.error(f"Storage upload failed: {resp.status_code} {resp.text[:200]}")
        raise HTTPException(502, "File storage upload failed")
    return resp.json()


async def get_object(path: str):
    key = await init_storage()
    async with httpx.AsyncClient(timeout=60) as http:
        resp = await http.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key})
        if resp.status_code == 404:
            key = await init_storage(force=True)
            resp = await http.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key})
    if resp.status_code == 404:
        raise HTTPException(404, "File not found in storage")
    if resp.is_error:
        logger.error(f"Storage download failed: {resp.status_code}")
        raise HTTPException(502, "File storage download failed")
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


async def _store_upload(file: UploadFile, allowed: dict, folder: str, lead_id: str, kind: str) -> dict:
    name = file.filename or ""
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in allowed:
        raise HTTPException(422, "File type not allowed")
    data = await file.read()
    if not data:
        raise HTTPException(422, "Empty file")
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 8MB)")
    result = await put_object(f"{STORAGE_APP}/{folder}/{uuid.uuid4()}.{ext}", data, allowed[ext])
    rec = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "kind": kind,
        "storage_path": result["path"],
        "original_filename": name,
        "content_type": allowed[ext],
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(dict(rec))
    return rec


@api_router.post("/leads/{lead_id}/cv")
async def upload_lead_cv(lead_id: str, file: UploadFile = File(...)):
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead not found")
    existing = await db.files.find_one({"lead_id": lead_id, "kind": "cv", "is_deleted": False})
    rec = await _store_upload(file, CV_TYPES, "cv", lead_id, "cv")
    if existing:
        await db.files.update_one({"id": existing["id"]}, {"$set": {"is_deleted": True}})
    await db.leads.update_one({"id": lead_id}, {"$set": {"cv_file_id": rec["id"]}})
    return {"id": rec["id"], "filename": rec["original_filename"], "size": rec["size"]}


@api_router.post("/admin/leads/{lead_id}/attachments")
async def upload_lead_attachment(lead_id: str, file: UploadFile = File(...), admin=Depends(get_current_admin)):
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead not found")
    rec = await _store_upload(file, ATTACH_TYPES, f"attachments/{lead_id}", lead_id, "attachment")
    return {"id": rec["id"], "filename": rec["original_filename"], "size": rec["size"]}


@api_router.get("/admin/leads/{lead_id}/files")
async def list_lead_files(lead_id: str, admin=Depends(get_current_admin)):
    return await db.files.find({"lead_id": lead_id, "is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/admin/files/{file_id}/download")
async def download_lead_file(file_id: str, admin=Depends(get_current_admin)):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    data, content_type = await get_object(rec["storage_path"])
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", rec.get("original_filename") or "file")
    return Response(content=data, media_type=rec.get("content_type", content_type),
                    headers={"Content-Disposition": f'attachment; filename="{safe_name}"'})


@api_router.delete("/admin/files/{file_id}")
async def delete_lead_file(file_id: str, admin=Depends(get_current_admin)):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True}})
    if rec.get("kind") == "cv":
        await db.leads.update_one({"id": rec["lead_id"]}, {"$unset": {"cv_file_id": ""}})
    return {"deleted": True}


# ---------- AI: match streaming + chat ----------

AI_MATCH_SYSTEM = (
    "You are Ashtor.net's AI Match Engine, an elite remote tech recruitment analyst. "
    "Respond ONLY with valid minified JSON, no markdown fences, no commentary, with keys: "
    "fit_score (integer 0-100), headline (short string), summary (max 2 sentences), "
    "suggested_roles (array of exactly 3 strings), salary_range_usd (string like \"$90k-$130k/yr\"), "
    "skills_gap (array of up to 3 strings), next_step (short actionable string). "
    "Write every string value in {lang}."
)

CHAT_SYSTEM = (
    "You are the Ashtor.net AI guide. Ashtor.net is a remote tech recruitment platform connecting "
    "software developers and cybersecurity specialists with global companies. Key facts: rigorous vetting "
    "(blind algorithmic challenges, live system design, threat simulations), matching within 72 hours, "
    "top 3% talent, 14-day risk-free trial for companies, USD salary benchmarking, 100% remote across 48 countries. "
    "Answer visitor questions concisely (under 120 words), guide talent to the intake form or LinkedIn connect, "
    "guide companies to the intake form. No markdown tables. Always respond in {lang}."
)


def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@api_router.post("/ai-match/stream")
async def ai_match_stream(input: AiMatchRequest):
    async def gen():
        from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
        try:
            lang_name = "Spanish" if input.language == "es" else "English"
            chat = LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=f"ai-match-{uuid.uuid4()}",
                system_message=AI_MATCH_SYSTEM.format(lang=lang_name),
            ).with_model("openai", "gpt-5.4")
            track = "job seeker looking for a remote tech role" if input.track == "talent" else "company looking to hire remote tech talent"
            msg = UserMessage(text=f"Track: {track}\nProfile / requirements:\n{input.profile_text}")
            chunks = []
            async for event in chat.stream_message(msg):
                if isinstance(event, TextDelta):
                    chunks.append(event.content)
                    yield sse({"type": "token", "content": event.content})
                elif isinstance(event, StreamDone):
                    break
            raw = "".join(chunks).strip()
            raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                m = re.search(r"\{.*\}", raw, flags=re.DOTALL)
                data = json.loads(m.group(0)) if m else {}
            result = {
                "fit_score": int(data.get("fit_score", 0)),
                "headline": str(data.get("headline", "")),
                "summary": str(data.get("summary", "")),
                "suggested_roles": [str(r) for r in data.get("suggested_roles", [])][:3],
                "salary_range_usd": str(data.get("salary_range_usd", "")),
                "skills_gap": [str(s) for s in data.get("skills_gap", [])][:3],
                "next_step": str(data.get("next_step", "")),
            }
            yield sse({"type": "done", "result": result})
        except Exception:
            logger.exception("ai-match stream failed")
            yield sse({"type": "error"})

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.post("/chat/stream")
async def chat_stream(input: ChatIn):
    async def gen():
        from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
        try:
            now = datetime.now(timezone.utc).isoformat()
            await db.chat_messages.insert_one({
                "session_id": input.session_id, "role": "user",
                "content": input.message, "created_at": now,
            })
            history = await db.chat_messages.find(
                {"session_id": input.session_id}, {"_id": 0}
            ).sort("created_at", 1).to_list(12)
            transcript = "\n".join(
                f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}" for m in history[-10:]
            )
            lang_name = "Spanish" if input.language == "es" else "English"
            chat = LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=f"chat-{input.session_id}",
                system_message=CHAT_SYSTEM.format(lang=lang_name),
            ).with_model("openai", "gpt-5.4")
            full = []
            async for event in chat.stream_message(UserMessage(
                text=f"Conversation so far:\n{transcript}\n\nRespond to the latest user message."
            )):
                if isinstance(event, TextDelta):
                    full.append(event.content)
                    yield sse({"type": "token", "content": event.content})
                elif isinstance(event, StreamDone):
                    break
            await db.chat_messages.insert_one({
                "session_id": input.session_id, "role": "assistant",
                "content": "".join(full), "created_at": datetime.now(timezone.utc).isoformat(),
            })
            yield sse({"type": "done"})
        except Exception:
            logger.exception("chat stream failed")
            yield sse({"type": "error"})

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.get("/chat/history")
async def chat_history(session_id: str):
    return await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(50)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
    "Content-Security-Policy": (
        "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; "
        "base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    ),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
}


@app.middleware("http")
async def apply_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
