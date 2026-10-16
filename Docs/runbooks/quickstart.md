# Runbook: Quickstart and Local Operations

## Purpose
Guide engineers and auditors through bringing up AegisFlow from a clean checkout, running health checks, verifying security controls, and validating test suites.

## Prerequisites
- Python 3.11+
- Node.js 20+
- Git

## Step-by-Step Procedure

### 1. Environment Setup
```bash
# Clone and enter directory
git clone https://github.com/aegisflow/aegisflow.git
cd aegisflow

# Set up Python virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
source .venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r requirements-dev.txt

# Copy configuration
cp .env.example .env
```

### 2. Database Migrations
```bash
alembic upgrade head
```

### 3. Verify Health Endpoints
```bash
# Start API in background or separate shell
uvicorn apps.api.main:app --port 8000

# Check liveness
curl http://localhost:8000/healthz

# Check readiness
curl http://localhost:8000/readyz
```

### 4. Running Frontend
```bash
cd apps/web
npm install
npm run dev
```

### 5. Executing Security Verification Suite
```bash
# Full test suite
pytest -v

# Synthetic secret detection check
pytest tests/security/test_secret_detection.py

# Lint & static analysis
ruff check .
mypy apps packages workers
```
