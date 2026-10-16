# AegisFlow — Product Design Specification
**Document:** `DESIGN.md`  
**Version:** 0.1  
**Status:** Proposed design baseline  
**Product:** AI-Native Application Security Platform  

---

## 1. Design Vision
AegisFlow should feel like a serious security engineering product: precise, calm, information-dense without being cluttered, and transparent about evidence and uncertainty.

The interface should help a security engineer answer five questions quickly:
1. What is the most important risk right now?
2. Why is it important?
3. What evidence supports that assessment?
4. What is the safest next action?
5. Has the issue actually been fixed and verified?

The product is not a generic AI chat app with a security theme. Its primary interaction model is structured findings, evidence, risk decisions, workflow states, and controlled remediation. AI is embedded where it reduces investigation effort, not used as the main navigation metaphor.

---

## 2. Product Design Principles

### 2.1 Evidence Before Decoration
Every key finding should show source, scanner, affected asset, commit, and evidence. AI-generated claims must be visually distinguishable from scanner facts and analyst decisions.

### 2.2 Risk Before Volume
Lead with actionable risk and exposure, not vanity metrics such as total scans or total findings alone. A large count is not inherently meaningful.

### 2.3 Progressive Disclosure
Show essential context first. Reveal stack traces, raw scanner JSON, scoring details, and model metadata in expandable panels.

### 2.4 Human Control
Approval and execution states must be explicit. Never make a dangerous action the default primary button. A recommendation must not look like an approved change.

### 2.5 Clear Uncertainty
Use labels such as *Needs context*, *Low confidence*, *Not verified*, and *Evidence unavailable*. Avoid presenting an AI-generated risk explanation as a fact.

### 2.6 Accessible by Default
Support keyboard navigation, screen readers, visible focus, reduced motion, adequate contrast, and status communication that does not depend on color alone.

### 2.7 Consistent Density
Use compact data tables for triage, generous spacing for decision details, and restrained use of cards. Avoid excessive glassmorphism, neon glow, decorative gradients, and oversized empty dashboards.

---

## 3. Brand and Visual Direction

### Personality
- Technical, dependable, measured, modern.
- Engineering control plane rather than consumer AI assistant.
- Confident but not alarmist.
- Neutral by default; strong colors reserved strictly for meaningful status or risk.

### Semantic Color Tokens
```css
:root {
  --color-bg: #0B1020;             /* Main dark application background */
  --color-surface: #111827;        /* Primary panels and navigation */
  --color-surface-raised: #182235; /* Popovers, elevated panels */
  --color-border: #2B364A;         /* Dividers and component outlines */
  --color-text: #F3F6FC;           /* Primary text */
  --color-text-muted: #A8B3C7;     /* Secondary text */
  --color-primary: #75A7FF;        /* Primary actions and links */
  --color-info: #56B4E9;           /* Informational state */
  --color-success: #39B980;        /* Verified/success state */
  --color-warning: #F2B84B;        /* Needs attention */
  --color-danger: #F06A78;         /* Critical/high-risk state */
  --color-focus: #A8C7FF;          /* Keyboard focus ring */
}
```

### Typography, Shape & Elevation
- **Fonts:** Inter / Manrope for UI, JetBrains Mono for code, hashes, and identifiers. Tabular numerals for all metrics.
- **Radii:** Modest 6–10px radii across controls and panels.
- **Elevation:** Borders and subtle surface contrast rather than thick drop shadows or heavy blur.

---

## 4. Application Information Architecture
Primary navigation:
1. **Overview** — Prioritized risk, changes, and operational health.
2. **Findings** — Searchable, filterable findings inventory.
3. **Projects** — Repositories, services, ownership, and integrations.
4. **Remediation** — Proposals, approvals, execution status, and verification.
5. **Evidence** — Scans, source occurrences, and verification artifacts.
6. **Reports** — Risk trends, remediation performance, and exports.
7. **Integrations** — Scanners, source control, and model providers.
8. **Audit log** — Security-sensitive activity and traceability.
9. **Settings** — Organization, members, roles, policies, retention, and model settings.

---

## 5. Core Screens & Data Categorization

### 5.1 Four Visual Categories on Finding Details
Every item in the finding detail workspace is categorized into one of four distinct visual tiers:
1. **Observed Fact:** Directly sourced from scanner, repository, or system (SARIF rule, file location, commit hash).
2. **Derived Assessment:** Computed deterministically by versioned risk model (Risk score, CISA KEV bonus, reachability modifier).
3. **AI Suggestion:** Generated triage proposal requiring human validation with explicit confidence metrics and citation tags.
4. **Human Decision:** Authorized human action, approval, exception, or verified resolution.

### 5.2 Remediation Lifecycle Timeline
```
Draft → Validated → Awaiting Approval → Approved → Executing → Verification Pending → Verified / Failed / Unknown
```

### 5.3 Microcopy Standards
- “Not verified — the scan did not confirm the fix.”
- “Approval expired because the plan changed.”
- “Risk score increased because the asset is externally reachable.”
- “AI suggestion — review before applying.”
*(Never state “AI secured your app”, “100% safe”, or “Fixed” before verification completes.)*

---

## 6. Design Acceptance Criteria
- [x] Primary task and hierarchy are clear without onboarding.
- [x] Facts, derived risk, AI suggestions, and human decisions are visually distinct.
- [x] Empty, loading, error, and permission-denied states exist.
- [x] Keyboard navigation works with visible focus rings.
- [x] Status does not rely on color alone (icons + text always present).
- [x] Dense data remains readable at common desktop widths.
- [x] Destructive and privileged actions are clearly labelled and confirmed.
- [x] Zero secret or unauthorized tenant data exposed in UI.
- [x] Content and metrics are sourced and defined.
- [x] Responsive layout across desktop, tablet, and mobile.
