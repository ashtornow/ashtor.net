from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    full_name: str
    email: str
    skills_or_needs: str
    location: str
    language: str = "en"
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


@api_router.get("/")
async def root():
    return {"message": "ashtor.net API operational"}


@api_router.post("/leads", response_model=Lead)
async def create_lead(input: LeadCreate):
    lead = Lead(**input.model_dump())
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)
    return lead


@api_router.get("/leads", response_model=List[Lead])
async def get_leads():
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return leads


@api_router.post("/social-connect", response_model=SocialConnect)
async def create_social_connect(input: SocialConnectCreate):
    if 'linkedin.com' not in input.profile_url:
        raise HTTPException(status_code=422, detail="Invalid LinkedIn profile URL")
    conn = SocialConnect(**input.model_dump())
    doc = conn.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.social_connections.insert_one(doc)
    return conn


@api_router.get("/social-connect", response_model=List[SocialConnect])
async def get_social_connects():
    conns = await db.social_connections.find({}, {"_id": 0}).to_list(1000)
    for c in conns:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return conns


@api_router.post("/ai-match")
async def ai_match(input: AiMatchRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    lang_name = "Spanish" if input.language == "es" else "English"
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"ai-match-{uuid.uuid4()}",
        system_message=(
            "You are Ashtor.net's AI Match Engine, an elite remote tech recruitment analyst. "
            "Respond ONLY with valid minified JSON, no markdown fences, no commentary, with keys: "
            "fit_score (integer 0-100), headline (short string), summary (max 2 sentences), "
            "suggested_roles (array of exactly 3 strings), salary_range_usd (string like \"$90k-$130k/yr\"), "
            "skills_gap (array of up to 3 strings), next_step (short actionable string). "
            f"Write every string value in {lang_name}."
        ),
    ).with_model("openai", "gpt-5.4")

    track = "job seeker looking for a remote tech role" if input.track == "talent" else "company looking to hire remote tech talent"
    msg = UserMessage(text=f"Track: {track}\nProfile / requirements:\n{input.profile_text}")

    chunks = []
    async for event in chat.stream_message(msg):
        if isinstance(event, TextDelta):
            chunks.append(event.content)
        elif isinstance(event, StreamDone):
            break

    raw = "".join(chunks).strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if not m:
            raise HTTPException(status_code=502, detail="AI response could not be parsed")
        try:
            data = json.loads(m.group(0))
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="AI response could not be parsed")

    return {
        "fit_score": int(data.get("fit_score", 0)),
        "headline": str(data.get("headline", "")),
        "summary": str(data.get("summary", "")),
        "suggested_roles": [str(r) for r in data.get("suggested_roles", [])][:3],
        "salary_range_usd": str(data.get("salary_range_usd", "")),
        "skills_gap": [str(s) for s in data.get("skills_gap", [])][:3],
        "next_step": str(data.get("next_step", "")),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
