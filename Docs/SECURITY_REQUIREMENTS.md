# AegisFlow — Security Requirements

**Document type:** Product security requirements  
**Status:** Draft baseline for implementation  
**Version:** 0.1  
**Applies to:** AegisFlow AI-Native Application Security Platform

## 1. Purpose

AegisFlow ingests application-security findings, normalizes and correlates them, prioritizes risk, proposes evidence-linked remediation, and verifies outcomes. This document defines the minimum security properties required before AegisFlow is used with real repositories or organizational security data.

AegisFlow is a security decision-support system. AI-generated analysis is advisory unless a separately authorized, policy-controlled execution path is explicitly enabled. No model output may independently grant authority or bypass policy.

## 2. Security objectives

1. **Confidentiality:** Protect source code, findings, credentials, customer metadata, prompts, and audit records from unauthorized access.
2. **Integrity:** Prevent unauthorized modification of findings, policies, approvals, remediation plans, and audit events.
3. **Availability:** Maintain predictable service behavior and recoverability under malformed input, abusive traffic, provider failure, and workload spikes.
4. **Tenant isolation:** Ensure one organization cannot read or affect another organization's data, jobs, integrations, or evidence.
5. **Least privilege:** Give users, services, integrations, and workers only the permissions necessary for their task.
6. **Evidence-based decisions:** Keep risk scores, AI explanations, and remediation recommendations traceable to source findings and versioned rules.
7. **Safe automation:** Separate recommendation from execution; require explicit authorization and bounded capabilities for state-changing actions.
8. **Auditability:** Record security-relevant actions in a tamper-evident, access-controlled audit trail.
9. **Secure development:** Apply security controls to the AegisFlow codebase and delivery pipeline itself.
10. **Privacy by design:** Minimize collected data, define retention, and avoid sending sensitive source material to external model providers without explicit configuration.

## 3. Scope and assumptions

### In scope
- Web application and API
- Authentication, authorization, organizations, projects, and roles
- Scanner connectors and ingestion pipeline
- Finding normalization, deduplication, correlation, and prioritization
- AI/LLM gateway, prompts, retrieval, and generated recommendations
- Remediation proposal and approval workflow
- Verification jobs and evidence storage
- Background workers, queues, databases, object storage, and deployment
- CI/CD pipeline, dependencies, container images, and secrets
- Audit events, metrics, logs, and administrative functions

### Out of scope for the initial release
- Autonomous production changes without human approval
- Unrestricted arbitrary shell execution
- Exploit execution against third-party systems
- Treating an LLM as an authorization or policy engine
- Guaranteed detection of all vulnerabilities or elimination of all false negatives

### Assumptions
- Deployments use supported versions of dependencies and operating systems.
- Operators protect cloud accounts, domain names, and deployment infrastructure.
- Integrations are configured by authorized users and can be revoked.
- Scanner outputs and repository contents are untrusted input.
- Model responses may be incorrect, manipulated, or malicious.

## 4. Identity and access requirements

**SEC-IAM-01 — Authentication:** All non-public application and API routes must require authenticated identity. Health endpoints must disclose no secrets or sensitive topology.

**SEC-IAM-02 — Organization scoping:** Every tenant-owned record must carry an organization identifier and be queried through an enforced tenant-scoped data-access layer.

**SEC-IAM-03 — Server-side authorization:** Authorization must be enforced server-side for every read, write, export, job, connector, and administrative operation. Hiding a UI control is not authorization.

**SEC-IAM-04 — Roles:** Initial roles should include Organization Owner, Security Admin, Security Analyst, Developer/Remediator, Auditor/Read-only, and Service Integration. Permissions must be explicit and documented.

**SEC-IAM-05 — Least privilege:** Roles and integration tokens must receive only required scopes. Service-to-service identities must be distinct and revocable.

**SEC-IAM-06 — Session security:** Use secure, HttpOnly, SameSite cookies for browser sessions where applicable; rotate sessions after privilege changes; expire inactive sessions; protect state-changing requests against CSRF when cookie authentication is used.

**SEC-IAM-07 — Strong authentication:** Support MFA through the selected identity provider before production use. Administrative and destructive operations should require step-up authentication where supported.

**SEC-IAM-08 — Token handling:** API tokens must be shown only at creation, stored as hashes when verification permits, scoped, revocable, expiring, and excluded from logs.

**SEC-IAM-09 — Account lifecycle:** Disable or revoke access promptly when a user or integration is removed. Log role, membership, and credential lifecycle changes.

## 5. Data protection requirements

**SEC-DATA-01 — Classification:** Classify data as public, internal, confidential, or highly sensitive. Source code, secrets, credentials, private findings, and raw prompts should be treated as confidential or higher.

**SEC-DATA-02 — Encryption in transit:** Use TLS for external and internal network traffic where supported. Reject invalid certificates; do not disable TLS verification as a workaround.

**SEC-DATA-03 — Encryption at rest:** Use managed encryption for databases, object storage, backups, and volumes. Document key ownership and rotation.

**SEC-DATA-04 — Secret storage:** Store integration credentials in a dedicated secret manager or encrypted secret store. Never store plaintext credentials in application configuration, source control, task payloads, or logs.

**SEC-DATA-05 — Data minimization:** Ingest only fields needed for security workflows. Prefer snippets, hashes, paths, and scanner metadata over full repository copies.

**SEC-DATA-06 — LLM data boundary:** External model calls must be configurable by organization and data category. Default to sending the minimum necessary context. Do not send secrets or full source files unless explicitly permitted and justified.

**SEC-DATA-07 — Retention:** Define configurable retention for raw scan payloads, source snippets, prompts, model outputs, job logs, and evidence. Provide controlled deletion workflows subject to legal/audit retention obligations.

**SEC-DATA-08 — Export control:** Exports must be authorized, tenant-scoped, rate-limited, audited, and protected against accidental cross-tenant disclosure.

**SEC-DATA-09 — Backups:** Encrypt backups, restrict access, define recovery objectives, and periodically test restoration.

## 6. API and application requirements

**SEC-APP-01 — Input validation:** Validate request bodies, query parameters, headers, file types, payload sizes, and scanner schemas using strict schemas.

**SEC-APP-02 — Output encoding:** Apply context-appropriate output encoding and avoid rendering scanner output, repository content, or model output as trusted HTML.

**SEC-APP-03 — Injection resistance:** Use parameterized database queries and safe process APIs. Do not interpolate untrusted data into SQL, shell commands, templates, or dynamic code.

**SEC-APP-04 — SSRF prevention:** Connectors must reject unsafe URL schemes, loopback/private/link-local/metadata destinations unless explicitly required by a controlled connector, revalidate redirects, and defend against DNS rebinding. Egress should be allowlisted where practical.

**SEC-APP-05 — Resource limits:** Enforce request size, timeouts, concurrency limits, queue limits, pagination limits, and per-tenant quotas.

**SEC-APP-06 — Error handling:** Return generic external errors without stack traces, secrets, internal paths, or provider credentials. Keep sanitized diagnostic details in restricted logs.

**SEC-APP-07 — CORS and browser controls:** Use explicit allowed origins, security headers, a suitable Content Security Policy, and secure cookie settings.

**SEC-APP-08 — File handling:** Treat uploaded reports and archives as untrusted. Validate content and size; defend against path traversal, archive bombs, symlinks, and unsafe filenames.

**SEC-APP-09 — Idempotency:** Ingestion and job-triggering endpoints should use idempotency or deduplication controls to limit duplicate processing.

## 7. Ingestion and scanner connector requirements

- Authenticate webhooks using signature verification and timestamp/replay protections where supported.
- Verify connector identity, tenant binding, payload schema, and allowed project association before accepting data.
- Preserve source provenance: scanner, version, scan identifier, timestamp, repository/project, commit SHA, and source finding ID when available.
- Make normalization deterministic and versioned.
- Keep raw payload access restricted; store only what is needed for troubleshooting and evidence.
- Quarantine malformed, oversized, or suspicious payloads rather than silently trusting them.
- Make retries bounded, observable, and idempotent.
- Do not allow scanner output to invoke tools or alter system instructions.

## 8. AI and agentic security requirements

**SEC-AI-01 — Untrusted output:** Treat prompts, retrieved documents, repository files, scanner descriptions, and model outputs as untrusted data.

**SEC-AI-02 — Instruction separation:** Keep system policy and application instructions separate from retrieved or user-provided content. Use structured inputs and outputs where possible.

**SEC-AI-03 — No authorization by model:** Only deterministic application policy and authenticated principals may authorize actions.

**SEC-AI-04 — Evidence-linked claims:** Recommendations must cite finding IDs, source locations, scanner evidence, relevant policy, and uncertainty. Unsupported claims must be labelled.

**SEC-AI-05 — Structured output:** Validate model responses against schemas, enforce length limits, reject unexpected tool calls, and safely handle malformed responses.

**SEC-AI-06 — Tool allowlist:** AI workflows may access only explicitly registered tools with narrow schemas and permission scopes. No generic unrestricted shell or arbitrary URL fetch tool.

**SEC-AI-07 — Human approval:** State-changing remediation must require a separate approval from an authorized human in the initial release.

**SEC-AI-08 — Least-context retrieval:** Retrieval must be scoped to the user's organization, project, and permission level. Prevent cross-tenant retrieval and embedding leakage.

**SEC-AI-09 — Provider controls:** Track provider/model, prompt-template version, request ID, token usage, and policy outcome without logging secrets or unnecessary source code.

**SEC-AI-10 — Evaluation:** Maintain an adversarial evaluation suite for prompt injection, data exfiltration, unsafe remediation, hallucinated evidence, and cross-tenant retrieval. Run it on relevant prompt, model, or pipeline changes.

**SEC-AI-11 — Fail closed for actions:** If model output is unavailable, invalid, ambiguous, or conflicts with policy, do not execute a state-changing action.

## 9. Remediation and verification requirements

- Separate finding, recommendation, approval, execution, and verification states.
- Every proposed change must include scope, expected effect, risk, preconditions, rollback plan, and verification steps.
- Approval must bind to an immutable plan hash or version so that a modified plan cannot reuse an earlier approval.
- Execution must run through a narrow broker with a fixed set of allowed operations.
- Use short-lived credentials and isolated workers; never pass long-lived credentials into model context.
- Enforce target allowlists, timeouts, concurrency caps, and environment restrictions.
- Capture pre-change state where practical and preserve execution logs with secrets redacted.
- Require post-change tests or a rescan before marking a finding as verified.
- If verification fails or times out, mark the result as unresolved/unknown rather than fixed.
- Support cancellation and safe rollback where technically possible; clearly document cases where rollback is not guaranteed.

## 10. Audit, monitoring, and incident response

Record, at minimum:
- Authentication failures and suspicious access patterns
- Membership, role, policy, and integration changes
- Finding ingestion, export, deletion, and cross-system connector activity
- AI recommendation creation and associated evidence references
- Approval, rejection, execution, cancellation, and verification events
- Administrative actions and audit access
- Security configuration and secret rotation events

Audit records must include actor/service identity, organization, action, target, timestamp, correlation ID, outcome, and relevant immutable object version. Do not record raw secrets. Restrict deletion and modification of audit records; use append-only storage or integrity checks where available.

Alert on repeated authorization failures, cross-tenant access attempts, unusual export volume, connector abuse, policy bypass attempts, suspicious agent behavior, and repeated verification failures.

Maintain an incident response runbook covering triage, containment, credential revocation, tenant impact analysis, evidence preservation, recovery, and customer communication.

## 11. Secure SDLC requirements

- Protect the default branch with required reviews and status checks.
- Require review for changes to authentication, authorization, tenant scoping, tool permissions, CI workflows, and deployment policy.
- Pin GitHub Actions to full commit SHAs where practical and review third-party actions.
- Run SAST, dependency scanning, secret scanning, container scanning, and license checks in CI.
- Generate an SBOM for release artifacts and scan dependencies continuously.
- Build reproducible, minimal containers as practical; run as non-root and use read-only filesystems where possible.
- Separate development, test, staging, and production credentials and data.
- Require migrations to be reviewed and tested, including tenant-isolation tests.
- Maintain a vulnerability disclosure and dependency-update process.
- Sign release artifacts or images where the delivery platform supports it.

## 12. Availability and resilience requirements

- Use bounded queues and backpressure for scan ingestion and AI tasks.
- Apply retry budgets, exponential backoff, circuit breakers, and provider timeouts.
- Prevent one tenant from monopolizing workers or storage.
- Provide health/readiness checks that do not reveal secrets.
- Define service-level objectives after initial workload measurements.
- Document recovery point objective (RPO) and recovery time objective (RTO) before production launch.
- Test database restoration, queue recovery, and reprocessing of idempotent ingestion jobs.

## 13. Compliance and governance

AegisFlow may support evidence collection for SOC 2 and security management processes, but using the product does not itself establish compliance or certification. Map controls to applicable frameworks only after reviewing the actual deployment, scope, and evidence.

Maintain:
- Data flow and subprocessor inventory
- Risk register and exception register
- Access review records
- Change management and release evidence
- Incident records and recovery test results
- Model/provider inventory and AI risk assessments
- Documented retention and deletion policy

## 14. Release acceptance gates

A production release must not proceed until:
1. Tenant isolation tests cover all tenant-owned endpoints and background jobs.
2. Authorization tests cover every role and sensitive operation.
3. Secrets scanning and dependency scanning pass, with documented exceptions.
4. AI prompt-injection and unsafe-tool-use tests pass the agreed baseline.
5. Remediation execution is disabled by default and approval binding is tested.
6. Audit events are generated for privileged actions and protected from ordinary user modification.
7. Backup restoration and incident-response procedures have been exercised.
8. Critical and high-risk findings from the release security review are fixed or explicitly accepted by an authorized risk owner.
9. Security documentation, data retention, and external model data handling are reviewed.
10. Known limitations and residual risks are documented in the release notes.

## 15. Initial risk priorities

| Priority | Requirement area | Reason |
|---|---|---|
| P0 | Tenant isolation and server-side authorization | Cross-tenant exposure would be a critical product failure |
| P0 | Secret handling and secure connector authentication | Integrations may expose repository and cloud access |
| P0 | AI tool permissions and remediation approval | Agentic actions can cause real system changes |
| P0 | Injection and SSRF defenses | Inputs include attacker-controlled code, reports, and URLs |
| P1 | Audit integrity and incident response | Necessary to investigate misuse and prove actions |
| P1 | Supply-chain and CI/CD controls | Protects the platform's own delivery path |
| P1 | Retention, export, and LLM data controls | Reduces data exposure and privacy risk |
| P2 | Advanced analytics and compliance mappings | Valuable after core trust boundaries are sound |

## 16. Definition of done

A requirement is complete only when there is an implementation, an automated test or documented manual verification, evidence of the result, an owner, and a known-failure path. A checkbox in a backlog is not proof of security.
