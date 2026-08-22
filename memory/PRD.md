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

### 2026-08-21 (v2.1)
- Custom wink logo mark (chevron eye + raised wink line + smile curve) replaces terminal icon in navbar and footer. LinkedIn kept in demo mode per user request.

### 2026-08-21 (v2.2)
- Logo lines re-spaced for legibility; wink animates on hover (line drops, springs back, smile widens); SVG favicon added (browser tab icon)
- Lead pipeline: leads have status new/contacted/matched/hired; PATCH /api/admin/leads/{id}/status (admin-only, validated); admin leads table has one-click status pills with optimistic UI

### 2026-08-21 (v2.3)
- Logo v3: right wink line centered at eye height, all strokes more separated; favicon updated to match
- Pipeline filters: leads table has All/New/Contacted/Matched/Hired filter pills with live counts
- Email alerts: Emergent-managed Resend; fire-and-forget notification email on new lead + new social connection (guardrail gate + escaped server-side templates, dark branded HTML). ALERT_EMAIL currently delivered@resend.dev (integration test address) — PENDING user's real email for production

### 2026-08-21 (v2.4)
- 5 content pages live with routes: /talent-portal, /client-hub, /security-charter, /terms, /privacy (bilingual, numbered sections, CTA to intake form, mailto info@ashtor.net). Footer links now route to them; footer shows contact email
- ALERT_EMAIL + EMAIL_REPLY_TO set to info@ashtor.net — NOTE: email proxy rejects it as undeliverable (422) because the mailbox/domain MX is not reachable yet; pipeline itself verified working (202 to delivered@resend.dev). Alerts resume automatically once info@ashtor.net mailbox exists

### 2026-08-22 (v2.5)
- LinkedIn OAuth ACTIVATED with user's real Client ID/Secret. Verified: status configured:true, /start 302 → linkedin.com with correct client_id/redirect_uri/scope/state/nonce + transaction cookie; frontend button redirects to LinkedIn. BLOCKED at LinkedIn side: "redirect_uri does not match the registered value" — user must register the redirect URI(s) in the LinkedIn app Auth settings:
  - preview: https://remote-connect-59.preview.emergentagent.com/api/auth/linkedin/callback
  - production: https://remote-connect-59.emergent.host/api/auth/linkedin/callback

### 2026-08-22 (v2.6)
- Alert email CONFIRMED working: delivery to info@ashtor.net accepted (202, id 3d909e7d) — MX records fixed by user
- Lead Notes: PATCH /api/admin/leads/{id}/note (admin-only); admin leads rows have a note toggle (amber when a note exists) with inline editor + save
- LinkedIn OAuth still blocked: "redirect_uri does not match the registered value" — user has NOT yet registered the redirect URLs in the LinkedIn app

### 2026-08-22 (v2.7)
- Interactive skills: each of the 14 roles in the Specializations section shows a floating glass "case file" popup on hover (tap on mobile) with realistic project example, highlighted metric, description and tech stack tags — bilingual EN/ES, spring entrance animation, accent-colored per domain. Screenshot verified.

### 2026-08-22 (v2.8)
- GitHub Connect: real OAuth backend (/api/auth/github/start|callback|me|logout|status, github_profiles keyed by github_id) auto-activates when GITHUB_CLIENT_ID/SECRET set; DEMO-mode modal fallback active meanwhile. Verified Identity card now shows dual provider rows (LinkedIn + GitHub). /social-connect validates domain per provider. Admin has GitHub Verified tab
- Lead Export: GET /api/admin/leads/export (admin-only CSV, 9 columns incl. status/note) + Export CSV button in leads filter bar (downloads ashtor_leads.csv)
- Success Stories: #stories marquee strip (8 best case files, bilingual, accent-colored) between Specializations and Pathways
- Case Deep Links: skill popup CTA "Request this profile / Solicitar este perfil" scrolls to #contact and pre-fills the intake textarea via 'ashtor:prefill' CustomEvent
- Tested by testing_agent: 12/12 backend + all frontend flows pass (/app/test_reports/iteration_1.json)

## Verified
- curl: login → me → admin endpoints (401 without cookie), linkedin status/me, chat stream tokens, ai-match stream tokens + final JSON (EN + ES), chat history persistence
- Screenshots: admin login + dashboard tabs, chat widget Q&A, AI match full flow (score 88/92 reports)

## Personas
- Senior developer / cybersecurity specialist seeking verified remote roles
- Founder / hiring manager at scaling tech company
- Admin (site owner) reviewing intake signals

## Backlog
- P0: User registers LinkedIn redirect URIs in LinkedIn app (OAuth blocked on that); user provides GitHub OAuth App Client ID/Secret to activate real GitHub flow (callback: {env_url}/api/auth/github/callback)
- P1: Refresh-token endpoint wiring on frontend (access token is 15 min)
- P2: X (Twitter) connect provider

## Test Credentials
See /app/memory/test_credentials.md — admin: admin@ashtor.net / AshtorAdmin#2026
