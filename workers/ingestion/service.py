import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.config import get_settings
from apps.api.models import Finding, FindingOccurrence, Scan, utc_now
from apps.api.tenancy import TenantContext, reauthorize_job_tenant_scope
from packages.connectors.semgrep import parse_semgrep_sarif
from packages.connectors.trivy import parse_trivy_json

logger = logging.getLogger("aegisflow.ingestion")
settings = get_settings()


class IngestionError(Exception):
    pass


class IngestionPayloadTooLargeError(IngestionError):
    pass


class IngestionMalformedError(IngestionError):
    pass


class IngestionService:
    def __init__(self, session: AsyncSession, tenant_context: TenantContext):
        self.session = session
        self.tenant_context = tenant_context

    async def ingest_report(
        self,
        scanner_type: str,
        project_id: str,
        raw_payload_bytes: bytes,
        commit_sha: Optional[str] = None,
        scanner_version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes scanner payload idempotently with provenance preservation.
        Enforces payload bounds, tenant isolation, and deduplication.
        """
        # 1. Reauthorize tenant scope before executing background operation
        await reauthorize_job_tenant_scope(
            self.session,
            self.tenant_context.organization_id,
            job_name=f"ingest_{scanner_type}",
        )

        # 2. Check payload size constraint
        if len(raw_payload_bytes) > settings.MAX_INGESTION_PAYLOAD_BYTES:
            raise IngestionPayloadTooLargeError(
                f"Payload size {len(raw_payload_bytes)} bytes exceeds maximum allowed "
                f"{settings.MAX_INGESTION_PAYLOAD_BYTES} bytes."
            )

        # 3. Compute raw payload hash for idempotency
        payload_hash = hashlib.sha256(raw_payload_bytes).hexdigest()

        # Check if already processed (Idempotency)
        stmt = select(Scan).where(
            Scan.organization_id == self.tenant_context.organization_id,
            Scan.project_id == project_id,
            Scan.raw_payload_hash == payload_hash,
        )
        res = await self.session.execute(stmt)
        existing_scan = res.scalars().first()
        if existing_scan:
            logger.info(
                "Scan payload hash %s already processed. Returning existing scan.", payload_hash
            )
            return {
                "status": "duplicate_skipped",
                "scan_id": existing_scan.id,
                "message": "Scan already ingested previously.",
            }

        # 4. Parse payload
        try:
            payload_str = raw_payload_bytes.decode("utf-8")
            parsed_json = json.loads(payload_str)
        except Exception as exc:
            raise IngestionMalformedError(f"Malformed JSON payload: {exc}") from exc

        parsed_findings: List[Any] = []
        scanner_norm = scanner_type.lower().strip()

        try:
            if scanner_norm == "semgrep":
                parsed_findings = parse_semgrep_sarif(parsed_json)
            elif scanner_norm == "trivy":
                parsed_findings = parse_trivy_json(parsed_json)
            else:
                raise IngestionMalformedError(f"Unsupported scanner type: '{scanner_type}'.")
        except Exception as exc:
            raise IngestionMalformedError(
                f"Failed to parse {scanner_type} document: {exc}"
            ) from exc

        # 5. Record Scan
        scan = Scan(
            organization_id=self.tenant_context.organization_id,
            project_id=project_id,
            scanner_name=scanner_norm,
            scanner_version=scanner_version,
            commit_sha=commit_sha,
            status="completed",
            raw_payload_hash=payload_hash,
        )
        self.session.add(scan)
        await self.session.flush()

        # 6. Normalize and deduplicate findings
        new_count = 0
        updated_count = 0

        for pf in parsed_findings:
            # Check for existing canonical finding in this project
            f_stmt = select(Finding).where(
                Finding.organization_id == self.tenant_context.organization_id,
                Finding.project_id == project_id,
                Finding.fingerprint == pf.fingerprint,
            )
            f_res = await self.session.execute(f_stmt)
            finding = f_res.scalars().first()

            if finding:
                # Update last seen timestamp; keep existing disposition
                finding.last_seen_at = utc_now()
                updated_count += 1
            else:
                # Insert new finding
                finding = Finding(
                    organization_id=self.tenant_context.organization_id,
                    project_id=project_id,
                    fingerprint=pf.fingerprint,
                    rule_id=pf.rule_id,
                    title=pf.title,
                    description=pf.description,
                    severity=pf.severity,
                    file_path=pf.file_path,
                    line_start=pf.line_start,
                    line_end=pf.line_end,
                )
                self.session.add(finding)
                await self.session.flush()
                new_count += 1

            # 7. Record immutable Occurrence linked to this scan
            occurrence = FindingOccurrence(
                organization_id=self.tenant_context.organization_id,
                finding_id=finding.id,
                scan_id=scan.id,
                commit_sha=commit_sha,
                message=pf.message,
                snippet=pf.snippet,
            )
            self.session.add(occurrence)

        await self.session.flush()

        return {
            "status": "success",
            "scan_id": scan.id,
            "total_parsed": len(parsed_findings),
            "new_findings": new_count,
            "updated_findings": updated_count,
        }
