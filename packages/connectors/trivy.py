import hashlib
from typing import Any, Dict, List

from apps.api.models import Severity
from packages.connectors.semgrep import ParsedFinding


def map_trivy_severity(sev_str: str) -> Severity:
    s = (sev_str or "").upper()
    if s == "CRITICAL":
        return Severity.CRITICAL
    elif s == "HIGH":
        return Severity.HIGH
    elif s == "MEDIUM":
        return Severity.MEDIUM
    elif s == "LOW":
        return Severity.LOW
    return Severity.INFO


def compute_trivy_fingerprint(target: str, vuln_id: str, pkg_name: str) -> str:
    norm = f"{target.strip().lower()}|{vuln_id.strip().upper()}|{pkg_name.strip().lower()}"
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def parse_trivy_json(payload: Dict[str, Any]) -> List[ParsedFinding]:
    """
    Parses Trivy JSON output into canonical findings.
    """
    if not isinstance(payload, dict) or "Results" not in payload:
        raise ValueError("Invalid Trivy JSON document: Missing 'Results' array.")

    findings: List[ParsedFinding] = []

    for res in payload.get("Results", []):
        if not isinstance(res, dict):
            continue

        target = res.get("Target", "unknown-target")
        vulns = res.get("Vulnerabilities", [])

        for v in vulns:
            if not isinstance(v, dict):
                continue

            vuln_id = v.get("VulnerabilityID", "UNKNOWN-CVE")
            pkg_name = v.get("PkgName", "unknown-package")
            installed_ver = v.get("InstalledVersion", "unknown")
            fixed_ver = v.get("FixedVersion", "N/A")
            title = v.get("Title") or f"Vulnerability in {pkg_name} ({vuln_id})"
            desc = v.get("Description") or f"{vuln_id} affects {pkg_name} version {installed_ver}."
            severity = map_trivy_severity(v.get("Severity", "UNKNOWN"))

            fingerprint = compute_trivy_fingerprint(target, vuln_id, pkg_name)
            message = f"{pkg_name}@{installed_ver} -> Fix available in: {fixed_ver}"

            findings.append(
                ParsedFinding(
                    fingerprint=fingerprint,
                    rule_id=vuln_id,
                    title=title,
                    description=desc,
                    severity=severity,
                    file_path=target,
                    snippet=f"Dependency: {pkg_name}=={installed_ver}",
                    message=message,
                    raw_metadata={
                        "pkg_name": pkg_name,
                        "installed_version": installed_ver,
                        "fixed_version": fixed_ver,
                        "primary_url": v.get("PrimaryURL"),
                    },
                )
            )

    return findings
