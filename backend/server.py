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
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse, RedirectResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
JWT_SECRET = os.environ["JWT_SECRET"]
SESSION_SECRET = os.environ["SESSION_SECRET"]
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
LINKEDIN_CLIENT_ID = os.environ.get("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.environ.get("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_REDIRECT_URI = os.environ.get("LINKEDIN_REDIRECT_URI", "")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
ALERT_EMAIL = os.environ.get("ALERT_EMAIL", "")
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
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
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
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
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


def _alert_html(title: str, rows: list) -> str:
    cells = "".join(
        f'<tr><td style="padding:6px 12px;font-size:12px;color:#94A3B8;text-transform:uppercase;'
        f'letter-spacing:1px">{escape(k)}</td>'
        f'<td style="padding:6px 12px;font-size:14px;color:#F8FAFC">{escape(str(v))}</td></tr>'
        for k, v in rows
    )
    admin_url = f"{FRONTEND_URL}/admin"
    return (
        '<table role="presentation" width="100%" style="background:#07090E;padding:32px 0"><tr><td align="center">'
        '<table role="presentation" width="520" style="background:#111620;border:1px solid #1E293B;'
        'border-radius:12px;padding:28px;font-family:Arial,sans-serif">'
        f'<tr><td style="font-size:11px;color:#10B981;letter-spacing:3px;padding-bottom:8px">ASHTOR.NET // INTAKE SIGNAL</td></tr>'
        f'<tr><td style="font-size:20px;color:#F8FAFC;font-weight:bold;padding-bottom:16px">{escape(title)}</td></tr>'
        f'<tr><td><table role="presentation" width="100%" style="border-top:1px solid #1E293B">{cells}</table></td></tr>'
        f'<tr><td style="padding-top:20px"><a href="{admin_url}" style="display:inline-block;background:#10B981;'
        'color:#07090E;font-size:13px;font-weight:bold;padding:10px 22px;border-radius:999px;'
        'text-decoration:none">Open Command Center</a></td></tr>'
        f'<tr><td style="padding-top:20px;font-size:11px;color:#64748B">Sent by {escape(EMAIL_FROM_NAME)}. '
        'We never ask for your password or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )


async def notify_new_lead(lead) -> None:
    if not ALERT_EMAIL:
        return
    try:
        await send_email(
            to=ALERT_EMAIL,
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
    if not ALERT_EMAIL:
        return
    try:
        await send_email(
            to=ALERT_EMAIL,
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
    if not ALERT_EMAIL:
        return None
    rows = await build_digest_rows()
    return await send_email(
        to=ALERT_EMAIL,
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


async def get_current_admin(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"email": payload.get("email")})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Not authorized")
    return {"email": user["email"], "name": user.get("name", "Admin"), "role": "admin"}


async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.linkedin_profiles.create_index("sub", unique=True)
    await db.github_profiles.create_index("github_id", unique=True)
    await seed_admin()
    asyncio.create_task(weekly_digest_loop())


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
async def create_lead(input: LeadCreate):
    lead = Lead(**input.model_dump())
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)
    asyncio.create_task(notify_new_lead(lead))
    return lead


PROVIDER_DOMAINS = {"linkedin": "linkedin.com", "github": "github.com"}


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
    await db.login_attempts.delete_one({"identifier": ident})
    response.set_cookie("access_token", create_access_token(str(user["_id"]), email),
                        httponly=True, secure=True, samesite="lax", max_age=900, path="/")
    response.set_cookie("refresh_token", create_refresh_token(str(user["_id"]),
                        ), httponly=True, secure=True, samesite="lax", max_age=604800, path="/")
    return {"email": email, "name": user.get("name", "Admin"), "role": "admin"}


@api_router.get("/auth/me")
async def auth_me(admin=Depends(get_current_admin)):
    return admin


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
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
                     "location", "language", "status", "note"])
    for l in leads:
        writer.writerow([
            l.get("created_at", ""), l.get("full_name", ""), l.get("email", ""),
            l.get("role", ""), l.get("skills_or_needs", ""), l.get("location", ""),
            l.get("language", ""), l.get("status", "new"), l.get("note", ""),
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
    response.set_cookie("linkedin_oauth", signed({"state": state, "nonce": nonce}),
                        max_age=600, httponly=True, secure=True, samesite="lax", path="/api/auth/linkedin")
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
    response.delete_cookie("linkedin_oauth", path="/api/auth/linkedin")
    response.set_cookie("app_session", signed({"sub": profile["sub"]}),
                        httponly=True, secure=True, samesite="lax", max_age=86400, path="/")
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
    response.delete_cookie("app_session", path="/")
    return response


# ---------- GitHub OAuth ----------

def github_configured() -> bool:
    return bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)


def _request_base(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
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
    response.set_cookie("github_oauth", signed({"state": state, "redirect_uri": redirect_uri}),
                        max_age=600, httponly=True, secure=True, samesite="lax", path="/api/auth/github")
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
    response.delete_cookie("github_oauth", path="/api/auth/github")
    response.set_cookie("github_session", signed({"gid": github_id}),
                        httponly=True, secure=True, samesite="lax", max_age=86400, path="/")
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
    response.delete_cookie("github_session", path="/")
    return response


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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
