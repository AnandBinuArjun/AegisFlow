# AegisFlow

> **Evidence-driven application security, from finding to verified fix.**

[![CI & Security Pipeline](https://github.com/aegisflow/aegisflow/actions/workflows/ci.yml/badge.svg)](https://github.com/aegisflow/aegisflow/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue)](https://www.python.org/)
[![Security Posture](https://img.shields.io/badge/Security-Safe%20by%20Default-green)](#security-posture)

AegisFlow is an AI-native application security platform that ingests scanner findings (Semgrep, Trivy), normalizes and correlates them, prioritizes risk with explainable deterministic scoring, produces evidence-linked AI triage and remediation proposals, and independently verifies outcomes.

---

## Core Product Principles

1. **Evidence before AI:** Source findings remain the immutable system of record.
2. **Deterministic policy before privileged action:** The LLM does not make authorization decisions or execute arbitrary tools.
3. **Human approval before state-changing remediation:** Remediation proposals carry immutable cryptographic hashes (`SHA-256`) and expire. Any modification invalidates prior approval.
4. **Independent verification before marking a finding fixed:** Fixes are verified by independent test runs and scanner re-evaluations, not by AI assertion.
5. **Strict tenant isolation:** Multi-tenancy is enforced server-side at every query boundary. Client-provided tenant IDs are never trusted blindly.
6. **Provider neutrality:** Fully functional out-of-the-box using the built-in deterministic mock provider. No external LLM credentials required.

---

## Architecture Overview

```text
aegisflow/
├── apps/
│   ├── web/                     # React + TypeScript frontend (Vite)
│   └── api/                     # FastAPI application & security middleware
├── packages/
│   ├── contracts/               # Shared Pydantic schemas & API contracts
│   ├── policy/                  # Deterministic policy rules & secret scanner
│   └── connectors/              # Scanner adapters & provider-neutral LLM gateway
├── workers/
│   ├── ingestion/               # Scanner parsing & quarantine handling
│   ├── analysis/                # Correlation & risk scoring
│   └── verification/            # Isolated verification jobs
├── migrations/                  # Alembic database migrations
├── fixtures/                    # Test fixtures & synthetic secrets
├── tests/                       # Unit, security, and tenant isolation tests
├── docs/                        # Architecture, threat model, requirements, ADRs
├── docker-compose.yml           # Local multi-service environment
└── .env.example                 # Safe configuration template
```

---

## Quick Start (Clean Checkout)

### Option A: Local Development (Fastest, zero-Docker fallback)

#### 1. Setup Backend (Python 3.11+)
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt

# Copy configuration (defaults to SQLite and mock offline LLM)
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start API server
uvicorn apps.api.main:app --reload --port 8000
```
API will be live at `http://localhost:8000`.  
- Liveness probe: `http://localhost:8000/healthz`
- Readiness probe: `http://localhost:8000/readyz`
- System info: `http://localhost:8000/api/v1/info`

#### 2. Setup Frontend (Node 20+)
```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### Option B: Docker Compose

```bash
docker compose up --build
```
- Web UI: `http://localhost:5173`
- API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## Security Posture & Non-Negotiable Controls

- **Zero autonomous remediation:** No production modifications can execute automatically.
- **No LLM shell/DB access:** The LLM gateway has no database access, shell access, or raw network egress.
- **Fail closed:** If policy, model output, or verification is ambiguous, actions fail closed.
- **No secrets in repository:** Enforced via synthetic secret scanner tests in CI.
- **CORS allowlist:** Explicit origins only; wildcards (`*`) with credentials strictly prohibited.
- **Security headers:** Strict CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## Running Verification & Tests

```bash
# Run full unit and security test suite
pytest -v

# Run lint and security checks (Bandit rules enabled)
ruff check .

# Check formatting
ruff format --check .

# Run static type checking
mypy apps packages workers

# Build frontend production bundle
cd apps/web && npm run build
```

---

## Known Limitations & Roadmap

| Phase | Milestone | Status |
|---|---|---|
| **Phase 0** | Repository foundation, monorepo, API, UI, CI, security checks | **Implemented** |
| **Phase 1** | Identity, tenancy, and data model (RBAC, project scoping) | **Implemented** |
| **Phase 2** | Scanner ingestion (Semgrep SARIF, Trivy JSON normalization) | **Implemented** |
| **Phase 3** | Prioritization engine and risk factor scoring | **Implemented** |
| **Phase 4** | AI triage gateway with schema validation & context minimization | **Implemented** |
| **Phase 5** | Remediation plans, approval workflows, and verification jobs | **Implemented** |
| **Phase 6** | System hardening, rate limiting, and release packaging | **Implemented** |
