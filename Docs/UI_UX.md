# AegisFlow — UI and UX Specification
**Document:** `UI_UX.md`  
**Version:** 0.1  
**Status:** Proposed interaction and usability baseline  

---

## 1. UX Objective
Help application security and engineering teams make safer decisions faster by reducing noise, showing evidence, explaining prioritization, and making remediation status trustworthy.

The UX should minimize three common failure modes:
- Analysts spend too much time reconciling scanner outputs.
- Developers receive findings without enough context to fix them.
- Teams mistake AI recommendations or submitted patches for verified remediation.

---

## 2. Primary User Goals

| Persona | Primary Goal | UX Success Signal |
| :--- | :--- | :--- |
| **AppSec Analyst** | Identify and triage the highest-value risks | Can explain why a finding is prioritized and trace its evidence |
| **Developer** | Understand and fix an assigned finding | Can locate affected code, review a proposed fix, and see verification results |
| **Security Manager** | Track risk reduction and exceptions | Can distinguish open risk from verified outcomes |
| **Auditor** | Trace a decision from evidence to disposition | Can inspect authorized audit records without needing implementation knowledge |
| **Organization Admin** | Configure access and integrations safely | Can understand granted scope and reverse or rotate access |

---

## 3. UX Principles
1. **One primary action per context:** Avoid presenting several equally prominent buttons for unrelated tasks.
2. **Make state visible:** Show whether a scan is queued, running, failed, stale, or complete.
3. **Explain prioritization:** Never show a risk score without factors and data freshness.
4. **Keep evidence close:** Users should reach the source finding or verification result in one or two interactions.
5. **Use progressive disclosure:** Advanced metadata is available but does not dominate the first view.
6. **Prevent mistakes:** Confirmation, scope review, and plan-version binding for high-impact actions.
7. **Support recovery:** Provide retry, cancel, assign, or request-help actions where safe.
8. **Avoid false certainty:** Unknown, unverified, and partial states remain explicit.
9. **Respect role and scope:** Users see only permitted projects, actions, and data.
10. **Measure real outcomes:** Optimize for validated remediation and reduced time-to-understanding.

---

## 4. Global Navigation and Page Hierarchy
Recommended desktop shell:
- **Left sidebar:** Overview, Findings, Projects, Remediation, Evidence, Reports, Integrations, Audit Log, Settings.
- **Top bar:** Organization selector, project context, global search, notifications, help, role / profile switcher.
- **Main area:** Page title, concise description, primary action, filters/content.
- **Optional right-side context panel:** Available on detail screens for drilldowns.

### Rules
- Keep current organization and project context visible at all times.
- Preserve filter and sort state when users open a finding and return to the list.
- Do not display navigation items as available if the user has no permission, except where a disabled item with an explanation improves discoverability.
- Server-side authorization remains mandatory regardless of navigation visibility.

---

## 5. Key Journeys

### Journey A — First-Time Setup
1. User signs in through the configured identity provider.
2. User selects or creates an organization, subject to authorization.
3. Setup checklist explains: create project, connect scanner/source control, run first scan, review findings.
4. Integration setup shows requested permissions before consent.
5. Test connection runs and displays a sanitized result.
6. User imports a sample or real authorized scan.
7. Overview explains what is populated and what context is still missing.
*UX Requirements:* Safe demo mode with synthetic findings; zero external LLM API key required; never imply connected until validation succeeds; show progress without blocking read-only exploration.

### Journey B — Triage a High-Priority Finding
1. Analyst opens Overview and selects a prioritized finding.
2. Finding detail presents title, affected project, priority, status, and source.
3. Analyst reviews evidence and risk factors.
4. Analyst requests AI analysis if appropriate.
5. UI shows generated summary separately from scanner evidence.
6. Analyst accepts, edits, or rejects the proposed disposition.
7. Analyst assigns an owner and records the next action.
*UX Requirements:* Explain why finding ranks highly; highlight missing inputs (e.g. unknown reachability, stale scan); allow direct access to source payload; keep original scanner severity visible alongside computed priority.

### Journey C — Review Remediation
1. Developer opens an assigned finding.
2. Reviews affected code, impact, and remediation options.
3. Requests or reviews a proposed patch.
4. Reviews the diff, tests, preconditions, and rollback notes.
5. Requests approval or submits the plan for review.
6. Approver sees exact plan version, hash, target, environment, and policy outcome.
7. Approver approves or rejects with an optional reason.
8. Execution/verification status updates asynchronously.
*UX Requirements:* Unmistakable target & scope; plan change invalidates previous approval; dangerous actions are not one-click from model response; approval does not imply verified remediation; cancellation & failure states visible.

### Journey D — Verify a Fix
1. User sees that a patch was applied or a remediation artifact was created.
2. A verification job runs the specified tests/scanner.
3. UI shows job state and criteria being checked.
4. Result becomes Verified, Failed, Unknown, or Needs review.
5. Evidence is attached to the finding and audit timeline.
6. If verification fails, UI suggests safe next steps without automatically repeating a risky action.
*UX Requirements:* Do not label finding "fixed" merely because a patch exists; show scan time and commit/version tested; make stale or incomplete verification clear; keep failure evidence accessible.

### Journey E — Connect an Integration
1. Admin chooses a provider.
2. UI describes requested scopes and why they are needed.
3. Admin authorizes or supplies a credential through a secure flow.
4. A test checks connectivity and scope.
5. Connection status and last sync are shown.
6. Admin can rotate or revoke the integration.
*UX Requirements:* Never display a stored secret again after creation; prefer read-only scopes; show repositories covered; explain disconnection impact; never expose secrets in error responses.

### Journey F — Investigate an Audit Event
1. User opens Audit Log.
2. Filters by actor, action, target, outcome, and date.
3. Opens an event to view actor, target, timestamp, correlation ID, and outcome.
4. Follows related plan, approval, job, or verification references.
5. Exports only records the user is permitted to access.
*UX Requirements:* Consistent timestamps with timezone indication; explicit redaction markers; read-only record; preserve traceability across asynchronous steps.

---

## 6. Screen-Level UX Requirements

### Overview
1. Critical actions required now.
2. Highest-risk findings and reasons.
3. Failed/stale ingestion or operational issues.
4. Risk and remediation trends.
5. Recent important activity.
*(Avoid walls of unlinked KPI cards. Each metric must link to its underlying records.)*

### Findings
- Fast search and practical filters (severity, priority, status, project).
- Clear difference between scanner baseline severity and AegisFlow computed priority.
- Row click opens detail; action menus do not trigger row navigation.
- Preserve pagination and filters when returning from details.

### Finding Detail
- Pinned title, status, priority, project, owner, and first action at the top.
- "Why this priority?" disclosure with explicit risk factors and missing context flags.
- Pinned evidence source and scan freshness.
- Distinct AI triage section marked with model provenance and confidence.
- Raw payload and model metadata behind progressive disclosure.

### Remediation Review
- Side-by-side or split diff view with accessible text alternative.
- Clearly distinguished states: Proposed, Approved, Executed, Verified.
- Exact plan version, target branch, and SHA-256 hash.
- Clear separation of duties notice (proposer cannot self-approve).
- Rollback explanation and scope.

### Reports
- Every chart has title, timeframe, definition, and accessible text/table alternative.
- Consistent color mapping for severity and status.
- Export scope and filter metadata included.

### Settings
- Grouped configuration sections (Access & RBAC, Safe Demo Mode, Integrations, Audit Policies).
- Impact explanations before applying security-sensitive changes.

---

## 7. UX States and Error Handling
Every asynchronous workflow must support:
- `Idle / Not started`
- `Queued`
- `Running`
- `Succeeded`
- `Failed`
- `Cancelled`
- `Timed out`
- `Unknown / Partial`
- `Permission denied`

For each failure, display:
1. What happened in plain language.
2. Whether any state change occurred.
3. Whether retry is safe.
4. The next recommended action.
5. Correlation or reference ID.

---

## 8. Accessibility & UI Acceptance Checklist
- [x] Current organization and project context visible.
- [x] Priority score distinguishable from scanner severity.
- [x] Findings link directly to source evidence.
- [x] AI suggestions visually distinct from observed facts.
- [x] Missing context and stale data explicitly flagged.
- [x] Filters and sort state preserved on navigation.
- [x] Loading, empty, error, timeout, and permission-denied states exist.
- [x] Approval bound to exact plan version and SHA-256 hash.
- [x] Plan mutation invalidates approval.
- [x] Finding resolution strictly requires independent verification.
- [x] Integration scopes and last-sync status visible.
- [x] Sensitive fields redacted and role-gated.
- [x] Keyboard and screen-reader support (WCAG 2.2 AA).
- [x] Text plus icon/shape for status; never color alone.
- [x] High-contrast responsive layout across desktop, tablet, and mobile.
- [x] Data tables and text alternatives for charts.
- [x] Safe synthetic demo mode available.
