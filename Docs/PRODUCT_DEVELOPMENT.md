# AegisFlow — Product Development Plan

**Version:** 0.1  
**Product stage:** Portfolio MVP moving toward a credible production-style prototype  
**Primary objective:** Demonstrate evidence-driven, AI-assisted AppSec workflows with safe-by-default controls.

## 1. Product vision

AegisFlow helps engineering and security teams move from noisy scanner output to a prioritized, explainable, verified remediation workflow. It should reduce manual triage effort without hiding uncertainty or handing uncontrolled authority to AI.

### Positioning
**AegisFlow: Evidence-driven application security, from finding to verified fix.**

### Target users
- Application Security Engineers
- Product Security Engineers
- Engineering leads
- Developers responsible for remediation
- Security managers who need risk and outcome reporting
- Auditors who need traceable evidence

### Core user problem
Organizations often have multiple scanners, duplicated findings, inconsistent severity ratings, unclear ownership, and weak feedback about whether remediation actually worked. AI can accelerate analysis, but unbounded AI automation creates new risk.

### Product promise
- One normalized view of application-security findings.
- Prioritization that explains why a finding matters.
- AI-assisted remediation grounded in evidence.
- Human-governed changes and independent verification.
- Audit trails that show what happened and why.

## 2. Product principles

1. **Evidence before AI:** Source findings remain the system of record.
2. **Risk over raw counts:** Prioritize likely impact, exposure, exploitability, and business criticality.
3. **Developer partnership:** Make controls actionable and explain decisions.
4. **No blind actions:** Never execute an AI proposal without explicit policy authorization.
5. **Verify, don't assume:** A patch is not a fix until verification criteria pass.
6. **Default to simple:** Begin with a modular monolith and a small connector set.
7. **Transparent limitations:** Show confidence, missing context, and known blind spots.
8. **Measurable outcomes:** Optimize for validated fixes and reduced time-to-remediation, not dashboard activity.

## 3. MVP scope

### Must have
- Authentication and organization/project model
- Role-based access control and tenant isolation
- One or two ingestion adapters (start with Semgrep SARIF and Trivy JSON)
- Canonical finding schema and provenance
- Finding list, detail view, filters, and status lifecycle
- Deduplication with source-occurrence preservation
- Explainable deterministic risk prioritization
- AI-generated triage summary and remediation proposal
- Evidence validation and prompt/model version metadata
- Manual approval workflow for remediation plans
- Verification workflow using tests or scanner re-runs
- Audit events and structured logs
- Secure CI pipeline and security tests
- Docker-based local setup and synthetic sample data

### Explicitly out of scope for MVP
- Autonomous production remediation
- Arbitrary shell commands issued by an LLM
- Full enterprise connector marketplace
- Multi-agent orchestration
- Custom foundation-model training
- Complex graph database infrastructure
- Claims of guaranteed vulnerability detection
- Compliance certification claims

## 4. Personas and primary user journeys

### AppSec analyst
1. Connect a scanner or upload a supported report.
2. Review normalized findings and duplicates.
3. See priority factors and missing context.
4. Request an AI explanation with citations to source evidence.
5. Create or review a remediation proposal.
6. Assign an owner and track verification.

### Developer
1. Open a finding assigned to their project.
2. Understand the vulnerable path and likely impact.
3. Review a proposed patch and test plan.
4. Apply or request changes through a branch/patch workflow.
5. See independent verification results.

### Security manager
1. View risk by project, severity, exploitability, and age.
2. Identify overdue critical findings and recurring causes.
3. Review exceptions and accepted risks.
4. Track time to remediation and verified-fix rates.
5. Export a scoped report with audit provenance.

### Auditor
1. View authorized evidence and audit events.
2. Trace a finding from source scan to disposition.
3. Verify who approved a plan and which version was executed.
4. Export only permitted records.

## 5. Suggested repository structure

```text
aegisflow/
├── apps/
│   ├── web/                     # React + TypeScript frontend
│   └── api/                     # FastAPI application
├── workers/
│   ├── ingestion/               # Scanner parsing and normalization
│   ├── analysis/                # Correlation and risk scoring
│   └── verification/            # Isolated verification jobs
├── packages/
│   ├── contracts/               # Shared schemas and API contracts
│   ├── policy/                  # Deterministic policy rules
│   └── connectors/              # Scanner/provider adapters
├── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   ├── tenant_isolation/
│   └── ai_evals/
├── fixtures/
│   ├── semgrep/
│   └── trivy/
├── docs/
│   ├── SECURITY_REQUIREMENTS.md
│   ├── THREAT_MODEL.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY_ARCHITECTURE.md
│   ├── PRODUCT_DEVELOPMENT.md
│   ├── ADR/
│   └── runbooks/
├── .github/workflows/
├── docker-compose.yml
├── .env.example
├── SECURITY.md
├── CONTRIBUTING.md
└── README.md
```

This is a proposed structure; keep the initial implementation simpler if a monorepo framework would create unnecessary overhead.

## 6. Delivery roadmap

### Phase 0 — Product definition and foundations
**Deliverables**
- Finalized problem statement, personas, and MVP boundaries
- Architecture decision records for tenancy, auth, queues, AI provider, and evidence storage
- Repository scaffolding and coding standards
- Data classification and initial risk register
- CI checks for formatting, linting, type checks, tests, secret scanning, and dependency scanning

**Exit criteria**
- Local environment starts from documented instructions.
- Threat model and security requirements are reviewed.
- No real customer data or credentials are needed for the demo.

### Phase 1 — Identity, tenancy, and core data
**Deliverables**
- Organization, membership, project, repository, integration, scan, finding, and audit models
- OIDC integration or a clearly isolated development auth mode
- Server-side RBAC and tenant-scoped data-access layer
- Database migrations and synthetic seed data
- Tenant isolation and authorization tests

**Exit criteria**
- Every tenant-owned endpoint has authorization tests.
- Cross-tenant access attempts fail consistently.
- Secrets are not committed or written to logs.
- Audit events exist for membership and policy changes.

### Phase 2 — Ingestion and normalization
**Deliverables**
- Semgrep SARIF parser
- Trivy JSON parser
- Canonical finding model
- Source provenance and occurrence records
- Idempotent ingestion and bounded retries
- Invalid-payload quarantine and safe error handling

**Exit criteria**
- Fixtures cover valid, malformed, oversized, duplicate, and hostile inputs.
- Replaying the same report does not create duplicate logical findings.
- Original scanner evidence remains traceable.

### Phase 3 — Risk prioritization and UI
**Deliverables**
- Versioned risk-scoring rules
- Finding list and detail pages
- Filters, ownership, lifecycle, and exceptions
- Explainable score breakdown
- Dashboard for age, severity, and project-level exposure

**Exit criteria**
- Every score has a version and contributing factors.
- Missing data is visible instead of silently treated as safe.
- Manual overrides are attributable and audited.

### Phase 4 — AI-assisted triage
**Deliverables**
- Provider-neutral LLM gateway
- Prompt templates stored and versioned in the repository
- Minimized context builder and redaction
- Structured outputs for explanation, evidence, and remediation proposal
- Evidence-ID validation
- AI evaluation harness for injection and hallucinated citations

**Exit criteria**
- AI output cannot authorize actions.
- Unknown evidence references are rejected.
- Prompt-injection tests cannot cause tool execution or cross-tenant retrieval.
- Provider failure leaves the non-AI workflow usable.

### Phase 5 — Remediation workflow and verification
**Deliverables**
- Versioned remediation plan and hash
- Approval/rejection workflow
- Branch/patch artifact generation
- Isolated tests and scanner re-runs
- Verification result states: verified, failed, unknown, needs review
- Audit chain from proposal to final result

**Exit criteria**
- Approval cannot be replayed against a modified plan.
- No production-target changes are enabled by default.
- Verification depends on independent evidence, not the model's assertion.
- Failure and cancellation paths are tested.

### Phase 6 — Hardening and release
**Deliverables**
- SAST, SCA, secret, container, and license scanning in CI
- SBOM for release artifacts
- Rate limits, quotas, and worker isolation
- Security headers, CORS policy, safe error handling
- Backup/restore and incident-response runbooks
- Security review report and known-limitations list
- Demo dataset, screenshots, and reproducible quick start

**Exit criteria**
- P0 security risks are closed or explicitly documented as blockers.
- Recovery procedure has been tested.
- Security tests run in CI.
- A reviewer can launch the demo without production credentials.

## 7. Prioritized backlog

### P0 — Trust foundations
- [ ] Tenant-scoped data-access functions
- [ ] Object-level authorization
- [ ] OIDC/session security
- [ ] Secret manager integration or safe local secret abstraction
- [ ] Audit events for privileged actions
- [ ] Input schema and size validation
- [ ] SSRF-safe connector policy
- [ ] No autonomous execution by default

### P1 — Useful AppSec workflow
- [ ] SARIF and Trivy ingestion
- [ ] Canonical findings and provenance
- [ ] Deduplication with source preservation
- [ ] Explainable risk scoring
- [ ] Finding ownership and lifecycle
- [ ] AI triage with evidence validation
- [ ] Human approval and immutable plan version
- [ ] Independent verification

### P2 — Operational maturity
- [ ] Queue monitoring and retry budgets
- [ ] Per-tenant quotas
- [ ] Evidence retention/deletion controls
- [ ] Export audit and field allowlists
- [ ] SBOM and artifact provenance
- [ ] Backup restoration test
- [ ] Security metrics and runbooks

### P3 — Future expansion
- [ ] GitHub App integration and pull-request annotations
- [ ] Additional SAST/SCA/cloud tools
- [ ] Service and dependency graph
- [ ] Policy packs
- [ ] Organization-level dashboards and trend reports
- [ ] Optional constrained auto-remediation after a separate safety review

## 8. Risk scoring model

Use a transparent multi-factor score. Avoid claiming a single formula is universally correct.

Candidate factors:
- Base severity (for example, CVSS)
- Known exploitation status (for example, CISA KEV)
- Exploit probability signal (for example, EPSS, with timestamp)
- Reachability and exposure
- Asset/business criticality
- Privilege required and attack preconditions
- Data sensitivity
- Fix availability and remediation confidence
- Evidence freshness

Requirements:
- Version the model and store contributing factors.
- Preserve raw source scores.
- Handle missing data explicitly.
- Avoid treating absence of exploit intelligence as proof of low risk.
- Permit documented, audited overrides.
- Test ranking behavior on a labelled fixture dataset.

## 9. AI product behavior

AI may:
- Summarize findings and evidence.
- Explain likely impact and preconditions.
- Suggest code changes and tests.
- Compare remediation alternatives.
- Identify missing context and uncertainty.

AI may not:
- Set or elevate user privileges.
- Approve a plan or override policy.
- Read records outside the caller's authorized scope.
- execute arbitrary commands or fetch arbitrary URLs.
- Mark a finding fixed without independent verification.
- Invent evidence IDs or claim that a test ran when it did not.

## 10. Product metrics

Collect baselines before setting targets.

### Security effectiveness
- Percentage of findings with source provenance
- Analyst-confirmed false-positive rate
- Percentage of recommendations with valid evidence references
- Percentage of remediation outcomes independently verified
- P0/P1 security defects found in AegisFlow itself

### Operational effectiveness
- Ingestion success and processing latency
- Time from ingestion to prioritization
- Mean time to remediate by severity
- Queue age and worker failure rate
- LLM latency, error rate, and cost per triage
- Percentage of jobs requiring manual recovery

### Developer experience
- Time from finding opened to actionable remediation
- Fix acceptance rate
- Failed or reverted patch rate
- Gate override frequency and reasons
- Developer feedback on clarity and usefulness

## 11. Definition of done

A feature is done only when:
- Acceptance criteria are met.
- Unit and relevant integration/security tests pass.
- Authorization and tenant scope are verified.
- Failure, timeout, and retry paths are handled.
- Logs are structured and secrets redacted.
- Documentation and API contracts are updated.
- Metrics are emitted where operationally relevant.
- Known limitations and residual risks are documented.
- A reviewer can reproduce the behavior locally.

## 12. Demo plan

Use a synthetic sample repository containing:
- One SQL injection example
- One unsafe deserialization or command injection example
- One vulnerable dependency fixture
- One container misconfiguration
- One duplicate finding from two scanners
- One false positive or non-reachable finding
- One prompt-injection string in a README or source comment

Demonstrate:
1. Import reports.
2. Normalize and deduplicate findings.
3. Explain ranking with visible factors.
4. Ask AI for an evidence-linked triage summary.
5. Generate a patch proposal.
6. Review and approve the exact plan.
7. Run tests and a rescan.
8. Show verified, failed, and unknown outcomes.
9. Trace every important transition in the audit view.

All demonstrations must use synthetic data and a sandboxed environment.

## 13. Launch checklist

- [ ] README, architecture, and threat model are current
- [ ] `.env.example` contains placeholders only
- [ ] No secrets in Git history or demo data
- [ ] CI security checks are enabled
- [ ] Authorization and cross-tenant tests pass
- [ ] AI evaluation suite passes agreed thresholds
- [ ] External model data handling is documented
- [ ] Worker isolation and network rules are documented
- [ ] Retention and deletion behavior is documented
- [ ] Backup/restore and incident runbooks exist
- [ ] Limitations are explicit
- [ ] No unsupported compliance claims
- [ ] Release tagged and reproducible

## 14. Portfolio presentation

The repository should communicate engineering judgment, not just feature count. Include:
- A clear architecture diagram
- A short threat model summary
- CI workflow badges that reflect actual workflows
- A short demo recording or screenshots
- Sample inputs and outputs
- A small benchmark with methodology and limitations
- Architecture decision records explaining trade-offs
- A roadmap distinguishing shipped, in progress, and planned work

Do not describe the project as production-ready until operational, privacy, security, and recovery controls have actually been implemented and tested.
