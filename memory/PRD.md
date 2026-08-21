# PRD — ashtor.net Landing Page

## Original Problem Statement
Build a landing page / hero section for ashtor.net, a remote tech recruitment platform connecting IT professionals (software developers, cybersecurity experts) with companies hiring globally. Value proposition: "Connect, build, remote." Users can find a job or hire talent globally. Clean, modern, tech-focused design.

## User Choices
- Content: Bilingual (ES / EN toggle)
- Scope: Full landing page (hero + sections)
- Style: Dark, tech-focused, award-worthy (framer-motion + lenis)
- Hero functionality: Lead capture form saving to MongoDB
- Hero copy (user-provided): "Your next remote tech role starts here." / "Ashtor.net bridges the gap between skilled IT professionals and forward-thinking companies looking for remote talent." / CTAs "Find your dream role" + "Hire top talent" / globe-with-connections visual
- Social connect: LinkedIn demo-simulated (modal + animated verification, saved to DB)
- AI: default choice → AI Match Engine (OpenAI gpt-5.4 via Emergent LLM key)

## Architecture
- Backend: FastAPI (`/app/backend/server.py`) on 0.0.0.0:8001, MongoDB via MONGO_URL
- Frontend: React 19 + Tailwind + framer-motion + lenis (`/app/frontend/src/`)
- LLM: emergentintegrations LlmChat, openai/gpt-5.4, EMERGENT_LLM_KEY in backend/.env

## Implemented (2026-08-21)
- Kinetic hero: masked line-by-line reveal, interactive canvas globe (Fibonacci sphere, connection arcs, pings, mouse parallax), live metrics grid, badge "CONNECT. BUILD. REMOTE."
- Tactical glass navbar with live latency pulse, ES/EN toggle (animated pill), CTAs
- Social connect: ConnectSocial card in hero → LinkedIn modal → animated verification steps → POST /api/social-connect → verified badge persisted (localStorage)
- AI Match Engine section: track toggle (talent/company), profile input, animated analysis steps, POST /api/ai-match → fit score ring, suggested roles, USD salary band, skills gap, next step (bilingual output)
- Manifesto chapters (numbered 01–03, asymmetric grid), specializations bento (3 domains), dual pathway tabs (talent/company), editorial marquee, terminal-style lead form (POST /api/leads), cinematic footer with watermark
- Backend endpoints: GET /api/, POST+GET /api/leads, POST+GET /api/social-connect, POST /api/ai-match

## Verified
- curl: leads, social-connect, ai-match all return valid responses (AI returns structured JSON, score 91-92 on test profile)
- Screenshots: hero EN/ES, LinkedIn modal flow (form → verifying → success → hero badge), AI section full analysis flow

## Personas
- Senior developer / cybersecurity specialist seeking verified remote roles
- Founder / hiring manager at scaling tech company needing vetted talent fast

## Backlog
- P1: Real LinkedIn OAuth (needs user LinkedIn app credentials)
- P1: AI chat assistant floating widget
- P2: Leads/social connections admin dashboard
- P2: GitHub / X social connect providers
- P2: Streaming SSE for AI match (token-by-token UI)

## Test Credentials
No auth implemented. Test data seeded via curl (lead: test@ashtor.net, LinkedIn profile: alexvance).
