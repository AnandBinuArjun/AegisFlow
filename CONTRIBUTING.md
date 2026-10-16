# Contributing to AegisFlow

Thank you for contributing to AegisFlow. Because AegisFlow is a security product, all contributions must adhere to strict quality, security, and verification guidelines.

---

## Code Quality Standards

1. **Type Safety:** All Python code must include type hints and pass `mypy apps packages workers` with zero errors. All TypeScript code must compile under `tsc --noEmit`.
2. **Linting and Security:** Code must pass `ruff check .` (including flake8-bandit security rules) and `ruff format --check .`.
3. **Tests:** Every new feature, endpoint, parser, or security control must include accompanying automated tests in `tests/`.
4. **No Secrets:** Never commit passwords, tokens, API keys, or private keys. Always use placeholders in `.env.example` and synthetic dummy values in test fixtures.
5. **Architectural Principles:**
   - Evidence before AI.
   - Deterministic policy before action.
   - Human approval before state changes.
   - Independent verification before marking a finding fixed.
   - Tenant isolation enforced server-side.

---

## Local Development Workflow

```bash
# 1. Activate venv
.venv\Scripts\activate   # Windows
source .venv/bin/activate # Linux/macOS

# 2. Run test suite
pytest -v

# 3. Format & check lint
ruff format .
ruff check --fix .
mypy apps packages workers

# 4. Frontend tests / build
cd apps/web
npm run build
```
