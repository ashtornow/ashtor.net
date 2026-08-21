# PRD — ashtor.net Landing Page

## Original Problem Statement
Build a landing page / hero section for ashtor.net, a remote tech recruitment platform connecting IT professionals (software developers, cybersecurity experts) with companies hiring globally. Value proposition: "Connect, build, remote." Users can find a job or hire talent globally. Clean, modern, tech-focused design.

## User Choices
- Content: Bilingual (ES / EN toggle)
- Scope: Full landing page (hero + sections)
- Style: Dark, tech-focused, award-worthy (framer-motion + lenis)
- Hero: lead capture form saving to MongoDB; user-provided copy + globe visual
- Social connect: LinkedIn (demo first, then real OAuth scaffolding — keys pending from user)
- AI: AI Match Engine + AI Chat Assistant (OpenAI gpt-5.4 via Emergent LLM key)
- Admin: private JWT-protected dashboard
- AI output: live SSE token streaming (terminal-style feed)

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), MongoDB (motor), SSE StreamingResponse
- Frontend: React 19 + Tailwind + framer-motion + lenis; routes `/` (landing) and `/admin`
- LLM: emergentintegrations LlmChat, openai/gpt-5.4, EMERGENT_LLM_KEY in backend/.env
- Auth: bcrypt + PyJWT httpOnly cookies; admin seeded idempotently from env; brute-force lockout (5 attempts / 15 min)
- LinkedIn OIDC: authlib + itsdangerous transaction cookies; upsert keyed by `sub`; no tokens stored

## Implemented
### 2026-08-21 (v1)
- Kinetic hero (masked line reveal, canvas globe with parallax, metrics), navbar with ES/EN toggle, manifesto chapters, specializations bento, dual pathway tabs, marquee, terminal lead form, footer
- LinkedIn demo connect (modal + simulated verification, saved to social_connections)
- AI Match Engine (structured JSON analysis)

### 2026-08-21 (v2)
- Real LinkedIn OIDC flow: /api/auth/linkedin/start|callback|me|logout + status endpoint; auto-activates when LINKEDIN_CLIENT_ID/SECRET set; demo mode fallback otherwise
- AI Chat Assistant: floating widget, SSE streaming replies, MongoDB-persisted history per browser session
- Admin Command Center at /admin: JWT login, tabs for Leads / LinkedIn connections / OIDC verified profiles, protected /api/admin/* endpoints
- Live AI streaming: /api/ai-match/stream renders raw model tokens in a terminal feed, then structured report

## Verified
- curl: login → me → admin endpoints (401 without cookie), linkedin status/me, chat stream tokens, ai-match stream tokens + final JSON (EN + ES), chat history persistence
- Screenshots: admin login + dashboard tabs, chat widget Q&A, AI match full flow (score 88/92 reports)

## Personas
- Senior developer / cybersecurity specialist seeking verified remote roles
- Founder / hiring manager at scaling tech company
- Admin (site owner) reviewing intake signals

## Backlog
- P0: User provides LinkedIn Client ID/Secret → real OAuth activates (register redirect URI: https://remote-connect-59.preview.emergentagent.com/api/auth/linkedin/callback)
- P1: Refresh-token endpoint wiring on frontend (access token is 15 min)
- P1: GitHub / X connect providers
- P2: Lead status pipeline (contacted/matched/hired) in admin
- P2: Email notifications on new lead (Resend)

## Test Credentials
See /app/memory/test_credentials.md — admin: admin@ashtor.net / AshtorAdmin#2026
