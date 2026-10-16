# AegisFlow — Threat Model

**Version:** 0.1  
**Method:** STRIDE-informed analysis with AI/agent-specific abuse cases  
**Status:** Initial design baseline; validate against the deployed implementation

## 1. System summary

AegisFlow ingests findings from source-code and infrastructure security tools, normalizes and correlates findings, prioritizes risk, uses an LLM to draft evidence-linked explanations and remediation proposals, and verifies fixes through controlled jobs.

The initial release is advisory-first. Automated state-changing remediation is disabled by default and must not be enabled without the approval, isolation, and verification controls described here.

## 2. Security goals

- Prevent cross-tenant access and data leakage.
- Preserve the integrity and provenance of security findings.
- Prevent untrusted content from controlling AI tools or application policy.
- Prevent unauthorized or unsafe remediation.
- Protect repository contents, secrets, credentials, and audit evidence.
- Ensure risk decisions are explainable and reproducible.
- Maintain availability and recoverability under malicious or malformed input.

## 3. Assets and sensitivity

| Asset | Examples | Impact if compromised |
|---|---|---|
| Source code and snippets | Repository files, line excerpts, commit metadata | Confidentiality breach, IP exposure |
| Security findings | CVEs, vulnerable paths, exploitable routes | Attacker gains a roadmap to weaknesses |
| Integration credentials | GitHub tokens, scanner API keys, cloud credentials | Repository or infrastructure compromise |
| Tenant identity and policies | Organization membership, roles, risk rules | Cross-tenant access or policy bypass |
| AI context and outputs | Prompts, retrieved content, recommendations | Data leakage, manipulated decisions |
| Remediation plans | Patch proposals, commands, target scope | Unauthorized or destructive changes |
| Approval records | Approver, plan hash, decision | Approval forgery or replay |
| Audit evidence | Actor/action/time/outcome records | Loss of accountability and incident evidence |
| Service availability | API, workers, queues, database | Loss of visibility or delayed remediation |
| Signing keys and application secrets | Session keys, webhook secrets | Broad compromise of trust boundaries |

## 4. Trust boundaries

1. **Internet to application edge:** Browser/API requests and webhook deliveries cross into the platform.
2. **Tenant boundary:** Organization-owned data must remain isolated across API, database, cache, object storage, vector search, and background jobs.
3. **Connector boundary:** Third-party scanners and repository providers return data that may be malformed or attacker-influenced.
4. **Data-to-model boundary:** Source snippets, scanner messages, READMEs, issue descriptions, and retrieved documents are sent to an LLM only under configured policy.
5. **Model-to-tool boundary:** Model-generated text must not directly invoke arbitrary tools or authorize privileged operations.
6. **Control plane to worker plane:** Jobs may process untrusted data and must have limited network, filesystem, and credential access.
7. **Approval-to-execution boundary:** Approval must be bound to the exact plan, target, and policy version that will execute.
8. **Application to infrastructure boundary:** The application relies on cloud IAM, database permissions, secret storage, network rules, and CI/CD identity.

## 5. High-level data flow

```text
User / GitHub / Scanner
        |
        v
API Edge -> Authentication + Authorization -> Tenant-scoped API
                                              |
                                              v
                                     Ingestion / Validation
                                              |
                                              v
                                     Normalize + Correlate
                                              |
                          +-------------------+------------------+
                          |                                      |
                          v                                      v
                  Findings Store                         Evidence Store
                          |
                          v
                 Risk Prioritization
                          |
                          v
              Policy-controlled LLM Gateway
                          |
                          v
              Evidence-linked Recommendation
                          |
                    Human Approval
                          |
                          v
             Restricted Execution Broker
                          |
                          v
                Isolated Verification Job
                          |
                          v
                  Audit + Final Status
```

The diagram is logical, not a claim that all components are already implemented.

## 6. Threat actors

- External attacker submitting crafted requests, webhooks, reports, URLs, or repository content.
- Malicious contributor creating a pull request or repository file designed to manipulate automated analysis.
- Compromised scanner or integration credential.
- Malicious or compromised tenant user with legitimate but limited access.
- Insider attempting unauthorized access, data export, or audit tampering.
- Compromised third-party package, CI action, container image, or model provider.
- LLM output that is incorrect, manipulated by prompt injection, or unsafe.
- Accidental operator misconfiguration that exposes a service, secret, or tenant dataset.

## 7. Threat register

Severity is an initial design estimate, not a measured risk rating. Reassess likelihood and impact after implementation and deployment review.

| ID | Threat | STRIDE | Initial severity | Mitigations and verification |
|---|---|---|---|---|
| AF-T01 | User reads another tenant's findings through a missing scope filter | Information disclosure / EoP | Critical | Tenant-scoped repository layer, DB constraints/RLS where suitable, negative cross-tenant tests for APIs, jobs, exports, caches, and vector retrieval |
| AF-T02 | User changes roles or approves their own privileged action | EoP / Tampering | High | Server-side role checks, separation of duties for sensitive actions, step-up authentication, immutable approval records |
| AF-T03 | Malicious repository text injects instructions into an LLM prompt | Tampering / EoP | High | Treat retrieved text as data, delimit context, structured output, tool allowlists, adversarial test suite, no model-based authorization |
| AF-T04 | LLM invents a vulnerability, evidence, or successful fix | Tampering | High | Evidence references required, schema validation, confidence/uncertainty, deterministic verification, never mark fixed based only on generated text |
| AF-T05 | AI tool call executes arbitrary shell commands | EoP / Tampering | Critical | No unrestricted shell tool; fixed operation catalog, schema validation, policy engine, isolated worker, explicit human approval |
| AF-T06 | Approval is replayed against a modified remediation plan | Tampering / EoP | Critical | Bind approval to immutable plan hash, target, environment, expiry, approver, and policy version; reject mismatches |
| AF-T07 | Connector URL causes SSRF to cloud metadata or internal services | EoP / Information disclosure | High | URL allowlists, scheme restrictions, DNS/IP validation, redirect revalidation, egress controls, metadata endpoint blocking, SSRF tests |
| AF-T08 | Scanner webhook is forged or replayed | Spoofing / Tampering | High | Signature verification, timestamps, replay window, secret rotation, payload-to-tenant binding, idempotency |
| AF-T09 | Secrets appear in logs, prompts, findings, or model traces | Information disclosure | Critical | Secret redaction, data minimization, secret scanning, restricted diagnostics, prompt filtering, test with synthetic canary secrets |
| AF-T10 | Archive/report upload causes path traversal or resource exhaustion | DoS / Tampering | High | File type/size limits, safe extraction, archive-bomb limits, no user-controlled output paths, isolated parsing |
| AF-T11 | SQL injection or unsafe query construction compromises records | Tampering / EoP | High | Parameterized queries, ORM-safe patterns, validation, SAST, integration tests with malicious inputs |
| AF-T12 | Cross-tenant vector retrieval returns another organization's source context | Information disclosure | Critical | Tenant and permission filters applied before retrieval, per-tenant namespaces or equivalent isolation, authorization tests, retrieval audit |
| AF-T13 | Queue message is altered or worker accepts another tenant's job | Spoofing / Tampering / EoP | High | Authenticated queue access, signed/validated job envelope where appropriate, tenant/project authorization at execution time, least-privilege worker identity |
| AF-T14 | Compromised dependency or GitHub Action exfiltrates secrets | EoP / Information disclosure | High | SHA-pinned actions, minimal workflow permissions, isolated runners, secret scoping, dependency scanning, SBOM, provenance controls |
| AF-T15 | Attacker floods ingestion or AI endpoints, exhausting costs or workers | DoS | High | Rate limits, quotas, bounded queues, payload limits, token budgets, timeouts, circuit breakers, per-tenant concurrency caps |
| AF-T16 | Audit records are altered or deleted after misuse | Repudiation / Tampering | High | Append-only or integrity-protected logs, restricted deletion, external log sink, sequence/hash integrity checks, alerts on gaps |
| AF-T17 | Export endpoint returns excess records or unredacted fields | Information disclosure | High | Field-level export allowlist, tenant authorization, export limits, re-authentication for sensitive exports, audit and tests |
| AF-T18 | Unsafe auto-fix introduces a regression or damages a target | Tampering / DoS | Critical | Advisory-first default, plan review, tests, branch-based changes, staging/sandbox, rollback strategy, verification and abort conditions |
| AF-T19 | Browser session is stolen or CSRF triggers privileged actions | Spoofing / EoP | High | Secure cookies, CSRF protection, CSP, session rotation, short-lived sessions, re-authentication for critical actions |
| AF-T20 | Misconfigured object storage or database exposes all tenants | Information disclosure | Critical | Private-by-default networking, least-privilege IAM, encryption, configuration checks, deployment tests, continuous posture monitoring |
| AF-T21 | Prompt or model logs retain sensitive code longer than intended | Information disclosure | High | Retention controls, provider review, minimal context, logging disabled/redacted by default, organization-level data policy |
| AF-T22 | Model/provider outage blocks critical ingestion or creates duplicate jobs | DoS / reliability | Medium | Decouple ingestion from AI, queue-based processing, idempotency, provider timeouts, fallback to non-AI workflow |
| AF-T23 | Finding deduplication merges unrelated issues or hides a critical finding | Tampering / availability of security signal | High | Stable source IDs, explainable dedup keys, preserve source records, reversible correlation, regression corpus and analyst review |
| AF-T24 | Risk score manipulation through untrusted metadata changes priorities | Tampering | High | Treat scanner metadata as input, validate provenance, version scoring rules, protect overrides, audit manual adjustments |

## 8. AI-specific abuse cases

### Abuse case A: Prompt injection from a repository
**Scenario:** An attacker opens a pull request containing a file that says to ignore prior instructions and reveal secrets or invoke a tool.

**Required outcome:** The system treats the file as untrusted evidence. It must not reveal secrets, modify policy, or execute tools. The event may be flagged as a prompt-injection attempt.

### Abuse case B: Malicious remediation recommendation
**Scenario:** The model recommends disabling authentication, widening CORS, suppressing a scanner, or running a destructive command to make a finding disappear.

**Required outcome:** A deterministic policy layer rejects unsafe actions. The proposal must include evidence and tests. A human approval cannot override hard safety constraints without a separately governed exception mechanism.

### Abuse case C: Cross-tenant retrieval
**Scenario:** A user asks a question designed to retrieve another tenant's private vulnerability report.

**Required outcome:** Retrieval authorization is enforced before content reaches the model. A prompt instruction alone is not an adequate control.

### Abuse case D: False verification
**Scenario:** The model claims a fix is successful because a patch looks plausible, while the vulnerability remains.

**Required outcome:** Only independent tests, scanner results, or approved verification criteria can transition a finding to verified-fixed.

## 9. Risk treatment plan

### P0 — Before any real customer data
- Tenant isolation and authorization coverage
- Secret management and redaction
- Secure connector/webhook validation
- SSRF protections
- Safe LLM context and strict tool permissions
- Approval-to-plan binding
- Audit events for privileged actions
- No autonomous remediation by default

### P1 — Before production use
- External security review and penetration testing
- Backup/restore and incident response exercises
- CI/CD supply-chain controls
- Abuse rate limits and cost budgets
- Retention/deletion controls
- Export and vector retrieval isolation tests
- Monitoring and alerting

### P2 — Maturity improvements
- Formal security metrics and SLOs
- Signed artifacts and stronger provenance
- Advanced anomaly detection
- Independent model evaluations and regression tracking
- Customer-specific policy packs and compliance evidence mapping

## 10. Verification plan

- Unit tests for validators, policy decisions, scoring, and redaction.
- Integration tests for authentication, authorization, tenant boundaries, queues, storage, and connectors.
- Negative tests attempting to read/update records using another tenant's identifiers.
- SSRF tests covering redirects, IPv4/IPv6, DNS rebinding scenarios, private ranges, and metadata addresses.
- AI red-team tests covering direct/indirect prompt injection, secret requests, tool abuse, fabricated evidence, and malicious patches.
- Approval replay tests with altered plan hash, target, policy version, and expired approval.
- Load and abuse tests for ingestion, exports, and LLM calls.
- Restore drills and incident-response tabletop exercises.
- Manual review of the highest-risk trust boundaries before a production launch.

## 11. Residual risks and limitations

- LLM output can remain inaccurate even with guardrails.
- Static analysis cannot prove the absence of vulnerabilities.
- Risk scores depend on the quality and freshness of asset, exploitability, and business context.
- A rollback may not fully reverse an external side effect.
- Third-party providers and scanners introduce supply-chain and data-processing risks.
- Threat likelihood and severity depend on the actual deployment topology and customer use.

This model must be updated when new connectors, agent tools, data classes, deployment modes, or remediation capabilities are added.
