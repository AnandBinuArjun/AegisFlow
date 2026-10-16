# Security Policy — AegisFlow

## Reporting Security Vulnerabilities

We take the security of AegisFlow extremely seriously. If you discover a vulnerability, please do NOT create a public GitHub issue.

Please report vulnerabilities privately by emailing:
**security@aegisflow.internal** (or your designated security lead)

Include:
- Type of vulnerability (e.g., cross-tenant data leakage, authorization bypass, SSRF, prompt injection)
- Step-by-step reproduction instructions
- Synthetic proof-of-concept (do NOT use real customer data or active production credentials)
- Potential impact

We will acknowledge receipt within 24 hours and provide an estimated remediation timeline.

---

## Core Security Invariants

1. **Tenant Isolation:** No user or integration from Tenant A may access, modify, or trigger tasks on records belonging to Tenant B.
2. **Server-Side Authorization:** Every endpoint and background job enforces authentication and authorization server-side.
3. **No Unrestricted Autonomous Remediation:** State-changing changes require signed approval tied to an immutable cryptographic plan hash.
4. **AI Boundary:** Model output is advisory and cannot execute tools or make authorization decisions.
5. **No Secrets in Source Code or Logs:** Enforced by static analysis and synthetic secret tests.
