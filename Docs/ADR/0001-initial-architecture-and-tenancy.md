# ADR 0001: Initial Modular Monolith Architecture and Server-Side Tenancy

## Status
Accepted

## Context
AegisFlow requires high security assurances, strict multi-tenant data isolation, provider neutrality for AI integration, and rapid vertical slice verification. Developing an early distributed microservices architecture would add operational overhead, distributed transaction complexity, and network boundary attack surfaces before the core data model and risk engine stabilize.

## Decision
1. **Modular Monolith Foundation:** Build the initial release as a modular monolith using FastAPI (Python 3.12) with Pydantic for strict schema enforcement and SQLAlchemy for data access, alongside asynchronous background workers for ingestion and verification.
2. **Server-Side Tenant Scoping:** Every database query involving tenant-owned records must explicitly filter by tenant/organization ID on the server. Never rely on client-supplied tenant headers or IDs without validation.
3. **Provider-Neutral AI Boundary:** The AI triage engine interfaces strictly through an abstract `LLMGateway`. The system defaults to a deterministic `MockLLMAdapter` that requires no external network calls or credentials.
4. **Relational Database with Flexible Drivers:** Use PostgreSQL for production and Docker Compose environments, while supporting SQLite (`aiosqlite`) for zero-friction local development and fast isolated test runs.

## Consequences
- Simplifies local deployment and automated CI testing.
- Guarantees tenant isolation logic is centralized in tested repository functions.
- Prevents vendor lock-in to any specific proprietary model provider.
