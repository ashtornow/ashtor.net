#!/usr/bin/env bash
# Idempotent setup for the ashtor.net Cloud Agent dev environment:
# installs MongoDB + Python/Node deps and writes dev .env files if missing.
# Long-running services (mongod, backend, frontend) are launched by the
# "terminals" entries in .cursor/environment.json, not here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. MongoDB (install once; skip if already present)
# ---------------------------------------------------------------------------
if ! command -v mongod >/dev/null 2>&1; then
  CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-noble}")"
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/8.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
  sudo apt-get update -qq
  sudo apt-get install -y -qq mongodb-org
fi
sudo mkdir -p /data/db
sudo chmod 777 /data/db

# ---------------------------------------------------------------------------
# 2. Backend: Python venv + dependencies
#    emergentintegrations is not on public PyPI and pins litellm via a
#    different direct URL, so install the rest first, then it with --no-deps.
# ---------------------------------------------------------------------------
sudo apt-get install -y -qq python3-venv >/dev/null 2>&1 || true
cd "$REPO_ROOT/backend"
python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
grep -v '^emergentintegrations==' requirements.txt > /tmp/ashtor_reqs.txt
.venv/bin/pip install --quiet -r /tmp/ashtor_reqs.txt
.venv/bin/pip install --quiet --no-deps emergentintegrations==0.2.0 \
  --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Dev .env (placeholders only; real secrets live in the hosting provider).
if [ ! -f .env ]; then
  cat > .env <<'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
FRONTEND_URL=http://localhost:3000
JWT_SECRET=dev-jwt-secret-change-me-0123456789abcdef
SESSION_SECRET=dev-session-secret-change-me-0123456789abcdef
ADMIN_EMAIL=ashtornet@gmail.com
ADMIN_PASSWORD=AshtorAdmin#2026
EMERGENT_EMAIL_KEY=dev-placeholder-email-key
EMAIL_FROM_NAME=Ashtor
EMERGENT_LLM_KEY=dev-placeholder-llm-key
ALERT_EMAIL=ashtornet@gmail.com
APPROVAL_EMAIL=ashtornet@gmail.com
EMAIL_REPLY_TO=ashtornet@gmail.com
EOF
fi

# ---------------------------------------------------------------------------
# 3. Frontend: dependencies + dev .env
# ---------------------------------------------------------------------------
cd "$REPO_ROOT/frontend"
if [ ! -f .env ]; then
  cat > .env <<'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
PORT=3000
HOST=::
EOF
fi
yarn install --frozen-lockfile || yarn install

echo "ashtor.net dev environment ready."
