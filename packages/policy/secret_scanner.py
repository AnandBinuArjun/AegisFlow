import re
from typing import Any, Dict, List

SECRET_PATTERNS = {
    "AWS Access Key": re.compile(
        r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}"
    ),
    "GitHub Token": re.compile(r"gh[pousr]_[A-Za-z0-9_]{36,255}"),
    "Generic Private Key": re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    "Generic Secret Keyword": re.compile(
        r"(?:api_key|secret_key|access_token|auth_token)\s*=\s*['\"][A-Za-z0-9_\-]{16,}['\"]",
        re.IGNORECASE,
    ),
}


def scan_text_for_secrets(content: str) -> List[Dict[str, Any]]:
    """
    Scans a string of text for potential secrets or credential patterns.
    Returns a list of detected secret matches with type and span.
    """
    findings = []
    for secret_type, pattern in SECRET_PATTERNS.items():
        for match in pattern.finditer(content):
            findings.append(
                {
                    "secret_type": secret_type,
                    "start": match.start(),
                    "end": match.end(),
                    "snippet_masked": match.group(0)[:6] + "..." + match.group(0)[-4:]
                    if len(match.group(0)) > 10
                    else "***",
                }
            )
    return findings
