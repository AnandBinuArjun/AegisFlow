# AegisFlow — Security Architecture

**Version:** 0.1  
**Purpose:** Describe how AegisFlow's security controls are enforced across application, data, AI, worker, and delivery layers.

## 1. Security architecture summary

AegisFlow handles sensitive source code and security findings while using probabilistic AI systems to assist with triage and remediation. The core architectural rule is:

> **AI may propose; deterministic policy authorizes; isolated workers execute; independent evidence verifies.**

The LLM must not have direct authority to change permissions, approve its own plans, access unrestricted credentials, or execute arbitrary commands.

## 2. Layered security model

### Layer 1 — Edge and API protection
- TLS and secure headers.
- Request size, rate, and concurrency limits.
- Explicit CORS allowlist.
- Schema validation and consistent error handling.
- Webhook signature and replay validation.
- WAF/bot protection where justified by deployment exposure.

### Layer 2 — Identity and authorization
- OIDC-based authentication.
- Organization membership and explicit RBAC.
- Server-side object-level authorization.
- Tenant scope enforced in repository/data-access functions.
- Separate identities for API, ingestion, AI, and execution workers.
- Short-lived, scoped integration credentials.
- MFA/step-up authentication for sensitive administration where supported.

### Layer 3 — Data and storage
- PostgreSQL access restricted to private networks.
- Tenant keys and referential integrity on tenant-owned records.
- Consider row-level security as defense in depth, not a substitute for application authorization.
- Private object storage with tenant-scoped paths/policies.
- Encryption at rest and in transit.
- Secret references rather than raw secret values in database records.
- Data retention and deletion policies.
- Backups with restricted access and tested restoration.

### Layer 4 — Ingestion and parsing
- Treat all reports, source snippets, URLs, archives, and webhook payloads as untrusted.
- Parse in bounded processes with memory, CPU, and time limits.
- Validate content schema and preserve provenance.
- Reject unsupported schemes and unsafe destinations.
- Never execute code merely because it appears in a report or repository.
- Keep raw payloads quarantined until validation succeeds.

### Layer 5 — AI and retrieval
- Tenant- and permission-scoped context selection.
- Data minimization and redaction before model calls.
- Explicit separation between trusted policy instructions and untrusted retrieved content.
- Structured response schema and strict output validation.
- Evidence references must resolve to records the user is authorized to see.
- No model-generated authorization decisions.
- No generic unrestricted browser, shell, or network tool.
- Provider-specific retention and training terms must be reviewed before sensitive data is sent.
- Log model/prompt versions and outcome metadata without logging unnecessary source code or secrets.

### Layer 6 — Remediation control plane
- Distinct workflow states: `draft`, `validated`, `awaiting_approval`, `approved`, `executing`, `verification_pending`, `verified`, `failed`, `rejected`, `cancelled`, `unknown`.
- Immutable plan version and cryptographic hash.
- Approval bound to the plan hash, target, environment, policy version, expiry, and approver.
- Reject execution if any bound value changes.
- Separate requester and approver for high-impact actions where possible.
- Hard policy restrictions cannot be bypassed by natural-language instructions.
- Execution is disabled by default in initial deployments.

### Layer 7 — Execution and verification plane
- Dedicated workers isolated from the API and database control plane.
- Non-root containers, restricted filesystem, CPU/memory/PID limits, and strict timeouts.
- Default-deny network egress; allow only required destinations.
- Short-lived credentials mounted only for the authorized operation.
- No long-lived cloud keys in environment variables or model context.
- Fixed operation catalog and typed arguments; avoid arbitrary shell execution.
- Per-job target allowlist and idempotency key.
- Capture redacted stdout/stderr and artifact hashes.
- Independent tests or scanner results determine verification.
- Unknown or partial results never count as a verified fix.

### Layer 8 — Audit and detection
- Append-only or integrity-protected security event stream.
- Correlation IDs across API, queue, worker, model, and verification.
- Redaction of tokens, credentials, and sensitive payloads.
- Alerts for privilege changes, cross-tenant denials, unusual exports, approval replay, tool-policy violations, and repeated connector failures.
- Separate audit-read permissions from ordinary application access.
- Restricted retention and deletion operations.

### Layer 9 — Software supply chain
- Protected branches and required reviews.
- Full-SHA pinning for GitHub Actions where practical.
- Minimal `GITHUB_TOKEN` permissions.
- No secrets in untrusted fork workflows.
- SAST, dependency, secret, container, and license scanning.
- SBOM and provenance for release artifacts where supported.
- Minimal base images, non-root runtime, and image vulnerability checks.
- Dependency updates and security advisories tracked to closure.

## 3. Identity and permission model

Suggested roles:

| Role | Read findings | Manage integrations | Create plans | Approve plans | Execute jobs | Manage users/policies | Read audit |
|---|---:|---:|---:|---:|---:|---:|---:|
| Organization Owner | Yes | Yes | Yes | Policy-dependent | Policy-dependent | Yes | Yes |
| Security Admin | Yes | Yes | Yes | Yes, if permitted | Policy-dependent | Limited | Yes |
| Security Analyst | Yes | No by default | Yes | No by default | No by default | No | Limited |
| Developer/Remediator | Project-scoped | No | Yes | No by default | No by default | No | Own/project-scoped |
| Auditor | Read-only | No | No | No | No | No | Yes, read-only |
| Integration identity | Narrow API scope | Own connector only | No | No | No | No | Own events only |

This is a starting matrix, not a final authorization policy. Project scope, separation of duties, and organization-specific restrictions must be explicit. Never assume that an Organization Owner's role means every automated action should be permitted without additional checks.

## 4. Tenant isolation design

Tenant isolation must span:
- HTTP route and object lookup
- Database query and relationship traversal
- Background job payload and worker reauthorization
- Redis/cache keys
- Object-storage paths and access policy
- Vector indexes and retrieval filters
- Export and reporting pipelines
- Audit search and administrative tooling

Implementation rules:
1. Derive tenant scope from authenticated membership or a trusted service integration, not a request parameter alone.
2. Require tenant scope in repository APIs and query helpers.
3. Verify project ownership before acting on a project, finding, plan, or job ID.
4. Re-authorize when a queued job begins; authorization at enqueue time is not sufficient.
5. Use composite constraints or equivalent integrity rules to prevent cross-tenant relationships.
6. Use opaque identifiers for enumeration resistance, but never treat unguessable IDs as authorization.
7. Include adversarial tests that deliberately substitute identifiers from a second tenant.
8. Consider PostgreSQL row-level security as defense in depth, with connection-pool context safely reset between requests.

## 5. AI security boundary

### Data entering the model
Potentially untrusted:
- Source code and comments
- README files and repository instructions
- Scanner messages and issue descriptions
- Dependency metadata and package documentation
- User prompts and uploaded reports
- Retrieved internal documentation

Controls:
- Minimize context and redact secrets.
- Label untrusted evidence as data, not instructions.
- Do not concatenate arbitrary content into privileged system instructions.
- Use retrieval authorization before content reaches the model.
- Add explicit injection and exfiltration tests.
- Limit context size and retain provenance.

### Data leaving the model
Potentially untrusted:
- Explanations and severity claims
- Tool-call requests
- Patch diffs and shell-like text
- URLs and references
- Claims that a finding is fixed

Controls:
- Validate schemas and length.
- Verify evidence IDs against authorized records.
- Parse patches safely and test them in isolation.
- Reject unknown tool names and arguments.
- Do not follow model-provided URLs without normal connector policy.
- Do not accept the model's own statement as verification.
- Never allow model output to modify authorization, policy, or audit records directly.

## 6. Remediation authorization protocol

A remediation execution request should require all of the following:

1. Authenticated requester with project-scoped permission.
2. A validated, versioned remediation plan.
3. Plan hash calculated server-side from canonical plan content.
4. Explicit target and environment.
5. Policy evaluation against action, target, and impact.
6. Approval by an authorized approver, bound to that exact hash and target.
7. Approval not expired or revoked.
8. Re-evaluation of policy and current target state at execution time.
9. Short-lived credentials and a restricted worker.
10. A recorded execution result and independent verification evidence.

Any plan change, target change, relevant policy change, or expired approval invalidates the approval. A plan must never inherit approval simply because its title or plan ID remains the same.

## 7. Secret management

- Store provider credentials in a secret manager or encrypted store.
- Keep only secret references and metadata in normal database records.
- Scope tokens to specific repositories/projects and read-only access where possible.
- Use separate credentials for ingestion and remediation.
- Rotate and revoke credentials on suspected exposure.
- Redact secrets from exceptions, logs, prompts, patches, and model traces.
- Do not inject credentials into environment variables accessible to arbitrary child processes if a narrower mechanism is available.
- Use synthetic canary secrets in tests to verify that logs and model payloads do not leak them.

## 8. Network and egress policy

Default-deny egress from processing and execution workers. Explicitly allow:
- Approved scanner/provider APIs
- Configured LLM provider endpoints
- Required package registries only for isolated build/test tasks
- Internal telemetry and queue endpoints

Block or tightly control:
- Cloud metadata endpoints
- Loopback, link-local, private, and reserved ranges for user-supplied URLs
- Arbitrary DNS, tunnels, and unapproved external destinations
- Access from execution workers to the database or control-plane administration endpoints

Connector exceptions must be narrowly scoped and documented. DNS and redirect validation must be performed at connection time where feasible.

## 9. Audit event schema

Suggested fields:
- `event_id`
- `occurred_at`
- `organization_id`
- `actor_type` and `actor_id`
- `action`
- `target_type` and `target_id`
- `request_id` and `correlation_id`
- `outcome`
- `policy_version`
- `object_version` or `plan_hash`
- `source_ip` where appropriate and legally permitted
- `metadata` allowlisted and redacted

Avoid arbitrary unbounded metadata. Audit events should not contain raw access tokens, full prompts, source files, or unredacted execution output by default.

## 10. Security control tests

Minimum automated suites:
- RBAC matrix and object-level authorization
- Cross-tenant isolation across API, jobs, caches, storage, and retrieval
- CSRF/session/CORS/security-header tests where applicable
- SQL injection, command injection, path traversal, SSRF, and oversized payload tests
- Webhook signature and replay tests
- Secret redaction and logging tests
- Prompt-injection and tool-abuse evaluations
- Approval replay and plan mutation tests
- Worker sandbox and network-policy tests
- Dependency and CI workflow security checks
- Audit event generation and integrity checks
- Backup/restore and recovery exercises

## 11. Security architecture decisions still required

Before production, explicitly decide:
- Whether PostgreSQL row-level security is used and how context is set safely.
- Whether evidence is stored in a single bucket with tenant-scoped policies or separate buckets.
- Which LLM providers are allowed and under what data-processing terms.
- How execution workers are isolated at the infrastructure level.
- Which operations are eligible for automated execution, if any.
- How audit events are made tamper-evident and retained.
- What retention and deletion requirements apply to prompts, evidence, and raw reports.
- Whether regulated or customer-specific data residency constraints apply.

## 12. Non-goals and limitations

No architecture can guarantee that AI output is correct or that scanning finds every defect. Controls reduce risk but require secure operations, monitoring, testing, and periodic review. Do not claim SOC 2, ISO 27001, ISO 42001, or other compliance based solely on this design.
