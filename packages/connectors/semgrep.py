import hashlib
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from apps.api.models import Severity


class ParsedFinding(BaseModel):
    fingerprint: str
    rule_id: str
    title: str
    description: str
    severity: Severity
    file_path: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    snippet: Optional[str] = None
    message: str
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


def compute_canonical_fingerprint(file_path: str, rule_id: str, snippet: Optional[str]) -> str:
    """
    Deterministic canonical fingerprint across scanner runs:
    SHA-256 over normalized file path, rule identifier, and trimmed snippet.
    """
    normalized_path = file_path.replace("\\", "/").strip().lower()
    normalized_snippet = (snippet or "").strip()
    data = f"{normalized_path}|{rule_id.strip()}|{normalized_snippet}"
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def map_sarif_severity(level: Optional[str], rule_metadata: Dict[str, Any]) -> Severity:
    """Maps SARIF level and security-severity scores to canonical Severity."""
    sec_sev = rule_metadata.get("security-severity")
    if sec_sev:
        try:
            score = float(sec_sev)
            if score >= 9.0:
                return Severity.CRITICAL
            if score >= 7.0:
                return Severity.HIGH
            if score >= 4.0:
                return Severity.MEDIUM
            return Severity.LOW
        except (ValueError, TypeError):
            pass

    lvl = (level or "").lower()
    if lvl == "error":
        return Severity.HIGH
    elif lvl == "warning":
        return Severity.MEDIUM
    elif lvl in ("note", "none"):
        return Severity.LOW
    return Severity.MEDIUM


def parse_semgrep_sarif(payload: Dict[str, Any]) -> List[ParsedFinding]:
    """
    Parses a Semgrep SARIF v2.1.0 document into canonical findings.
    Validates structural schema and sanitizes untrusted input.
    """
    if not isinstance(payload, dict) or "runs" not in payload:
        raise ValueError("Invalid SARIF document: Missing 'runs' array.")

    findings: List[ParsedFinding] = []

    for run in payload.get("runs", []):
        tool = run.get("tool", {})
        driver = tool.get("driver", {})
        rules_list = driver.get("rules", [])
        rules_by_id = {r.get("id"): r for r in rules_list if isinstance(r, dict) and "id" in r}

        results = run.get("results", [])
        for result in results:
            if not isinstance(result, dict):
                continue

            rule_id = result.get("ruleId", "unknown-rule")
            rule_meta = rules_by_id.get(rule_id, {}).get("properties", {})
            rule_short_desc = (
                rules_by_id.get(rule_id, {}).get("shortDescription", {}).get("text", rule_id)
            )

            message = result.get("message", {}).get("text", "No message provided.")
            level = result.get("level")
            severity = map_sarif_severity(level, rule_meta)

            locations = result.get("locations", [])
            file_path = "unknown"
            line_start = None
            line_end = None
            snippet = None

            if locations and isinstance(locations, list):
                loc = locations[0]
                phys = loc.get("physicalLocation", {})
                artifact = phys.get("artifactLocation", {})
                file_path = artifact.get("uri", "unknown")
                region = phys.get("region", {})
                line_start = region.get("startLine")
                line_end = region.get("endLine")
                snippet = region.get("snippet", {}).get("text")

            fingerprint = compute_canonical_fingerprint(file_path, rule_id, snippet)

            findings.append(
                ParsedFinding(
                    fingerprint=fingerprint,
                    rule_id=rule_id,
                    title=rule_short_desc,
                    description=message,
                    severity=severity,
                    file_path=file_path,
                    line_start=line_start,
                    line_end=line_end,
                    snippet=snippet,
                    message=message,
                    raw_metadata={"rule_meta": rule_meta, "level": level},
                )
            )

    return findings
