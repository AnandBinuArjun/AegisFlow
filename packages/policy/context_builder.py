import re
from typing import List, Optional

from packages.policy.secret_scanner import SECRET_PATTERNS


def redact_sensitive_data(text: str) -> str:
    """
    SEC-DATA-06 & Non-negotiable Rule #6:
    Redacts credentials, tokens, and private keys before sending content to AI models.
    """
    if not text:
        return ""

    redacted = text
    for pattern in SECRET_PATTERNS.values():
        redacted = pattern.sub("[REDACTED_SECRET]", redacted)

    # Redact common password / bearer token assignments
    redacted = re.sub(
        r"(password|passwd|bearer|auth_token)\s*[:=]\s*['\"][^\s'\"]+['\"]",
        r"\1: '[REDACTED]'",
        redacted,
        flags=re.IGNORECASE,
    )
    return redacted


def sanitize_code_snippet(snippet: Optional[str], max_chars: int = 2000) -> str:
    """
    Enforces context budget and data minimization.
    """
    if not snippet:
        return "[No code snippet available in scanner evidence]"
    redacted = redact_sensitive_data(snippet)
    if len(redacted) > max_chars:
        return redacted[:max_chars] + "\n...[TRUNCATED FOR CONTEXT BUDGET]..."
    return redacted


def validate_cited_evidence(cited_ids: List[str], authorized_evidence_id: str) -> bool:
    """
    Non-negotiable Rule #3 & Acceptance Criteria:
    Validation that every cited evidence ID exists and is authorized.
    Rejects hallucinated or unauthorized cross-tenant evidence references.
    """
    if not cited_ids:
        return False
    for cid in cited_ids:
        if cid != authorized_evidence_id:
            return False
    return True
