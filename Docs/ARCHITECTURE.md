# AegisFlow — System Architecture

**Version:** 0.1  
**Status:** Proposed reference architecture

## 1. Product purpose

AegisFlow is an AI-native application security platform that turns fragmented scanner results into a prioritized, evidence-linked, auditable workflow:

**Ingest → Normalize → Correlate → Prioritize → Explain → Approve → Remediate → Verify → Preserve Evidence**

The first release should optimize for trustworthy visibility and guided remediation, not maximum autonomy.

## 2. Architectural principles

1. **Evidence before explanation:** AI summarizes and reasons over evidence; it does not manufacture ground truth.
2. **Policy before action:** Deterministic authorization and policy checks govern all state changes.
3. **Advisory-first:** Recommendations are available before automated remediation is enabled.
4. **Tenant isolation by design:** Tenant identity is propagated and enforced at every data access boundary.
5. **Small deployable units:** Begin with a modular monolith plus asynchronous workers; split services only when operational evidence justifies it.
6. **Provider replaceability:** Scanner and LLM integrations sit behind adapters.
7. **Reproducibility:** Version scoring rules, normalization rules, prompts, and remediation plans.
8. **Observable by default:** Every job has a correlation ID, state, timing, result, and audit trail.
9. **Secure failure modes:** Invalid policy, invalid model output, and uncertain verification fail closed for actions.
10. **Outcomes over activity:** Measure risk reduction, fix verification, and developer friction.

## 3. Initial technology stack

| Concern | Proposed choice | Notes |
|---|---|---|
| Frontend | React + TypeScript | Security findings, projects, approvals, risk views |
| API | Python + FastAPI + Pydantic | API schemas, business logic, connectors |
| Primary database | PostgreSQL | Tenant-owned entities, findings, workflow, audit metadata |
| Queue/cache | Redis initially | Queue backend and caching only with explicit isolation/TTL |
| Workers | Python worker processes | Ingestion, correlation, AI tasks, verification |
| Object/evidence storage | S3-compatible private storage | Raw scanner payloads and evidence artifacts |
| Authentication | OIDC provider | Avoid implementing password/security primitives from scratch |
| Scanning | Semgrep, Trivy, dependency scanner adapters | Store source provenance and tool versions |
| AI integration | Provider-neutral LLM gateway | Strict schemas, policy checks, minimal context |
| Packaging | Docker Compose for development | Production topology documented separately |
| CI/CD | GitHub Actions | Tests, SAST, dependency, secret, and image scanning |
| Telemetry | Structured logs + metrics + traces | OpenTelemetry-compatible design is suitable |

Use managed services for production where appropriate. Do not add Kubernetes to the initial architecture unless deployment scale or customer requirements justify its operational cost.

## 4. Logical components

### 4.1 Web application
Responsibilities:
- Display findings, assets/projects, risk explanations, remediation plans, approvals, and audit events.
- Enforce UI-level usability and accessibility.
- Never be the only enforcement point for authorization.
- Display evidence references and uncertainty alongside AI-generated content.

### 4.2 API and identity layer
Responsibilities:
- Authenticate users and service identities.
- Resolve organization membership and effective permissions.
- Validate request schemas and quotas.
- Apply authorization before accessing tenant-owned records.
- Create jobs and return stable job identifiers.

### 4.3 Connector adapters
Responsibilities:
- Integrate with GitHub and scanner tools.
- Validate webhook signatures and payloads.
- Map external project/repository IDs to internal projects.
- Normalize errors, retries, rate limits, and provider-specific behavior.
- Never trust scanner-supplied tenant IDs without server-side mapping.

Initial connectors: Semgrep SARIF/JSON, Trivy output, and GitHub repository/commit metadata. Add others only after the generic ingestion contract is stable.

### 4.4 Ingestion service
Responsibilities:
- Validate payload size and schema.
- Preserve provenance.
- Assign tenant/project scope from trusted connector configuration.
- Deduplicate retries and record ingestion status.
- Quarantine invalid payloads for restricted review.

### 4.5 Normalization and correlation engine
Responsibilities:
- Map source findings into a canonical finding model.
- Preserve original scanner IDs and source evidence.
- Deduplicate without destroying source records.
- Correlate findings to repository, commit, service, package, asset, and ownership.
- Version normalization and correlation logic.

### 4.6 Risk prioritization engine
Responsibilities:
- Combine severity, exploit intelligence, reachability, exposure, asset criticality, and business context.
- Produce an explainable score and contributing factors.
- Keep manual overrides separate, attributable, and auditable.
- Recalculate when underlying evidence or scoring versions change.

Do not present a numeric score as objective truth. Display the contributing factors, missing context, and scoring version.

### 4.7 AI gateway
Responsibilities:
- Build minimized, tenant-scoped context.
- Call configured model providers.
- Enforce input/output schemas and timeouts.
- Track prompt version and model metadata.
- Redact sensitive data and reject unexpected tool requests.
- Produce evidence-linked summaries and remediation proposals.

The gateway must not grant permissions. It should have no direct credentials for customer environments.

### 4.8 Workflow and approval service
Responsibilities:
- Manage remediation lifecycle states.
- Require authorization for approval/rejection.
- Bind approval to a plan version/hash, target, environment, and policy version.
- Enforce separation of duties where configured.
- Expire stale approvals when plans or relevant context change.

### 4.9 Execution and verification workers
Responsibilities:
- Run a fixed catalog of authorized operations in isolated workers.
- Use short-lived credentials and narrowly scoped target permissions.
- Enforce timeouts, quotas, and target allowlists.
- Capture redacted logs and execution metadata.
- Run independent verification tests or scanners.
- Return success, failure, or unknown with evidence.

In the initial MVP, workers may create a patch branch or patch artifact for review rather than modify production systems.

### 4.10 Evidence and audit service
Responsibilities:
- Store links to source findings, scan artifacts, approvals, execution outcomes, and verification results.
- Record who did what, when, to which object, and with what outcome.
- Protect audit data against ordinary user modification.
- Apply retention and export controls.

## 5. Canonical data model

Minimum entities:

- `Organization`: tenant boundary and settings.
- `User`: identity mapping and account status.
- `Membership`: organization, user, role, status.
- `Project`: tenant-scoped application/repository grouping.
- `Repository`: provider, external ID, canonical URL, default branch.
- `Integration`: provider, project scope, secret reference, status.
- `Scan`: scanner, version, commit, status, timestamps, provenance.
- `Finding`: normalized issue, severity, status, confidence, first/last seen.
- `FindingOccurrence`: source finding ID, file/line, commit, scanner evidence.
- `Asset`: service/package/container/cloud resource where applicable.
- `RiskAssessment`: scoring version, contributing factors, calculated score.
- `Recommendation`: evidence references, proposed fix, uncertainty, model/prompt version.
- `RemediationPlan`: immutable version, target, proposed changes, tests, rollback plan.
- `Approval`: approver, decision, plan hash, policy version, timestamp, expiry.
- `ExecutionJob`: authorized operation, worker state, bounded scope, result.
- `Verification`: tests/scans run, evidence, outcome, timestamp.
- `AuditEvent`: actor, tenant, action, target, outcome, correlation ID, integrity metadata.

Every tenant-owned entity must have a tenant key or an unambiguous enforced relationship to one. Do not rely on client-supplied organization IDs for authorization.

## 6. Key workflows

### 6.1 Finding ingestion
1. Connector receives a report or signed webhook.
2. Validate identity, signature, size, schema, and replay window.
3. Resolve the project/tenant using trusted integration configuration.
4. Store minimal raw evidence in restricted storage.
5. Normalize findings and preserve source occurrences.
6. Deduplicate idempotently and update last-seen state.
7. Enqueue correlation and risk calculation.
8. Emit an audit event and processing metrics.

### 6.2 AI-assisted triage
1. User opens a finding they are authorized to view.
2. Context builder selects relevant evidence within the same tenant/project.
3. Redaction and policy checks run before model submission.
4. LLM returns a schema-constrained explanation and proposed remediation.
5. Server validates evidence references against known records.
6. Store recommendation with model/prompt versions and uncertainty.
7. Display evidence and limitations to the user.

### 6.3 Remediation proposal
1. User requests a patch proposal.
2. Policy determines whether the request is permitted.
3. AI drafts a patch or a structured plan.
4. Static checks and tests run in an isolated environment.
5. Plan is versioned and hashed.
6. Authorized reviewer approves or rejects that exact plan.
7. In the MVP, create a branch/patch artifact for human review.
8. Verification scan determines whether the finding remains.

### 6.4 Verification
1. Resolve the approved target and commit/version.
2. Run configured tests/scanners in a bounded worker.
3. Validate result provenance and completion status.
4. Mark verified only if the defined verification criteria pass.
5. If ambiguous or incomplete, mark `unknown` or `needs_review`.
6. Preserve evidence and audit the transition.

## 7. Deployment topology

### Development
- Docker Compose for API, frontend, PostgreSQL, Redis, and worker.
- Synthetic data only.
- Local model/provider credentials kept outside source control.
- Seeded multi-tenant test fixtures.

### Production reference
- TLS-terminated ingress/WAF or equivalent edge protection.
- Stateless API replicas.
- Private PostgreSQL with managed backups and encryption.
- Private object storage for evidence.
- Queue and worker pool with bounded concurrency.
- Secret manager and workload identity.
- Restricted egress for connector and AI calls.
- Separate isolated execution workers for untrusted code and verification.
- Centralized logs, metrics, alerts, and append-only audit sink.
- Separate environments and credentials for deployment stages.

Do not expose database, queue, object storage, or execution-worker control ports publicly.

## 8. API outline

Example versioned endpoints (final contract must be documented in OpenAPI):

- `POST /api/v1/scans` — initiate or register a scan.
- `POST /api/v1/ingestion/{connector}` — receive validated connector payload.
- `GET /api/v1/projects/{project_id}/findings` — list authorized findings.
- `GET /api/v1/findings/{finding_id}` — read finding and evidence references.
- `POST /api/v1/findings/{finding_id}/triage` — create AI-assisted analysis.
- `POST /api/v1/findings/{finding_id}/remediation-plans` — create a plan.
- `POST /api/v1/remediation-plans/{plan_id}/approvals` — approve/reject exact plan version.
- `POST /api/v1/remediation-plans/{plan_id}/verification` — request verification.
- `GET /api/v1/jobs/{job_id}` — check job state.
- `GET /api/v1/audit-events` — authorized audit query.

Use consistent error codes, pagination, request IDs, idempotency, and rate limits. Do not expose internal database IDs as authorization tokens.

## 9. Reliability and observability

Every async job should record:
- Job ID, correlation ID, tenant/project scope, job type, creation time
- Attempt number, queue delay, execution duration, and outcome
- Sanitized error category and retry decision
- Input/output evidence references, not secrets
- Worker and policy versions

Monitor ingestion success, queue age, AI provider latency/errors, recommendation validation failures, verification outcomes, tenant quota consumption, export activity, and security policy denials.

## 10. Architecture decisions to record

Create ADRs for:
1. Modular monolith versus microservices.
2. Tenant isolation strategy in database and storage.
3. Authentication and identity provider.
4. Queue/worker technology and idempotency.
5. LLM provider abstraction and data residency.
6. Risk scoring factors and versioning.
7. Approval and plan-hash design.
8. Evidence retention and audit integrity.
9. Execution isolation model.
10. Criteria for enabling any automated remediation.

## 11. Architecture boundaries for MVP

Must ship:
- Authentication and organization membership
- Tenant-scoped projects and findings
- At least one reliable scanner ingestion path
- Canonical finding model and provenance
- Explainable deterministic prioritization
- AI-assisted triage with evidence validation
- Audit trail and basic metrics
- Secure CI pipeline and automated tests

Defer:
- Autonomous production changes
- Large-scale graph database
- Multi-agent orchestration
- Broad integration marketplace
- Complex compliance automation
- Kubernetes deployment if a simpler managed deployment meets needs

## 12. Success measures

Track outcomes such as:
- Percentage of findings with complete provenance
- Duplicate rate and analyst-confirmed false-positive rate
- Time from ingestion to prioritized finding
- Percentage of AI recommendations with validated evidence
- Percentage of remediations independently verified
- Mean time to remediate by severity and asset criticality
- Developer friction: rejected gates, time to resolve, and exception frequency
- Cross-tenant and authorization test coverage

Set numerical targets only after collecting a baseline.
