# Runbook: AppSec Incident Response Runbook

## Scope
Procedures for responding to suspected cross-tenant data leakage, unauthorized plan approval, credential compromise, or SSRF attempts.

## Incident Severity Levels
- **SEV-1 (Critical):** Confirmed cross-tenant data access, leaked production integration token, unapproved state mutation.
- **SEV-2 (High):** Repeated SSRF probes blocked by defenses, elevated rate limit denial spikes.
- **SEV-3 (Medium):** Scanner parser exception spikes, quarantine buffer overflow.

## Immediate Containment Actions
1. **Revoke Compromised Credentials:**
   - Rotate integration tokens and invalid session tokens immediately.
2. **Isolate Compromised Tenant:**
   - Deactivate tenant membership or toggle organization active state.
   - Background jobs fail closed immediately via `reauthorize_job_tenant_scope`.
3. **Audit Trail Inspection:**
   - Query `audit_events` for actor ID, action timeline, and affected resources.
4. **Post-Incident Review:**
   - File incident report and author ADR if architectural mitigation is required.
