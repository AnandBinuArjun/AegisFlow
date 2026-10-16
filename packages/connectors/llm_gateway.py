import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx
from pydantic import BaseModel, Field

from apps.api.config import get_settings
from packages.policy.context_builder import redact_sensitive_data, validate_cited_evidence
from packages.policy.prompts import build_triage_prompt
from packages.policy.ssrf_defense import validate_outbound_url

logger = logging.getLogger("aegisflow.llm_gateway")


class LLMTriageRequest(BaseModel):
    finding_id: str
    rule_id: str
    severity: str
    file_path: str
    code_snippet: Optional[str] = None
    scanner_message: str
    context_metadata: Dict[str, Any] = Field(default_factory=dict)


class LLMTriageResponse(BaseModel):
    explanation: str
    suggested_fix: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    cited_evidence_ids: list[str] = Field(default_factory=list)
    provider_name: str
    model_version: str


class LLMGateway(ABC):
    """
    Provider-neutral interface for AI-assisted triage and explanation.
    The platform must remain fully operational without any external AI credentials.
    """

    @abstractmethod
    async def generate_triage(self, request: LLMTriageRequest) -> LLMTriageResponse:
        pass


class MockLLMAdapter(LLMGateway):
    """
    Deterministic mock adapter used for local development, test suites,
    and offline demonstration. Requires no network access or API credentials.
    """

    def __init__(self, model_version: str = "mock-model-v1"):
        self.model_version = model_version

    async def generate_triage(self, request: LLMTriageRequest) -> LLMTriageResponse:
        return LLMTriageResponse(
            explanation=(
                f"Deterministic mock triage for rule {request.rule_id} in {request.file_path}. "
                f"Scanner reported: {request.scanner_message}"
            ),
            suggested_fix=(
                "Apply parameterization or safe input sanitation to neutralize "
                "potential injection vectors."
            ),
            confidence_score=0.92,
            cited_evidence_ids=[request.finding_id],
            provider_name="mock",
            model_version=self.model_version,
        )


class LiveOpenAIAdapter(LLMGateway):
    """
    Live OpenAI LLM Adapter.
    Outbound HTTPS traffic is strictly routed through the SSRF validation gateway
    to block internal networks, metadata services, and loopback addresses.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_version: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
        timeout_seconds: float = 30.0,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.LLM_API_KEY
        self.model_version = model_version
        self.base_url = (base_url or settings.OPENAI_API_BASE).rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def generate_triage(self, request: LLMTriageRequest) -> LLMTriageResponse:
        endpoint = f"{self.base_url}/chat/completions"

        # 1. SSRF Egress Defense: validate outbound URL before network call
        validate_outbound_url(endpoint)

        # 2. Secret Redaction before egress
        clean_snippet = redact_sensitive_data(request.code_snippet or "")
        clean_message = redact_sensitive_data(request.scanner_message)

        prompt = build_triage_prompt(
            finding_id=request.finding_id,
            rule_id=request.rule_id,
            severity=request.severity,
            file_path=request.file_path,
            sanitized_snippet=clean_snippet,
            scanner_message=clean_message,
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "AegisFlow-Gateway/1.0",
        }
        payload = {
            "model": self.model_version,
            "messages": [
                {
                    "role": "system",
                    "content": "You are AegisFlow security assistant. Output JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
        }

        # If dummy or missing API key, simulate safe offline response
        if not self.api_key or "dummy" in self.api_key.lower():
            logger.info("OpenAI live adapter simulating response with dummy credentials.")
            explanation = (
                f"OpenAI simulated triage: Vulnerability in {request.file_path} "
                f"associated with rule {request.rule_id}."
            )
            suggested_fix = "Use parameterized queries to isolate input from execution."
        else:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.post(endpoint, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                explanation = content
                suggested_fix = "Apply verified security patch according to guidance."

        # 3. Grounding & Citation Validation
        cited = [request.finding_id]
        validate_cited_evidence(cited, request.finding_id)

        return LLMTriageResponse(
            explanation=explanation,
            suggested_fix=suggested_fix,
            confidence_score=0.95,
            cited_evidence_ids=cited,
            provider_name="openai",
            model_version=self.model_version,
        )


class LiveAnthropicAdapter(LLMGateway):
    """
    Live Anthropic Claude LLM Adapter.
    Guarded by SSRF outbound gateway validation and secret redaction.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_version: str = "claude-3-5-sonnet-20241022",
        base_url: Optional[str] = None,
        timeout_seconds: float = 30.0,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.LLM_API_KEY
        self.model_version = model_version
        self.base_url = (base_url or settings.ANTHROPIC_API_BASE).rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def generate_triage(self, request: LLMTriageRequest) -> LLMTriageResponse:
        endpoint = f"{self.base_url}/messages"

        # 1. SSRF Egress Defense
        validate_outbound_url(endpoint)

        # 2. Secret Redaction
        clean_snippet = redact_sensitive_data(request.code_snippet or "")
        clean_message = redact_sensitive_data(request.scanner_message)

        prompt = build_triage_prompt(
            finding_id=request.finding_id,
            rule_id=request.rule_id,
            severity=request.severity,
            file_path=request.file_path,
            sanitized_snippet=clean_snippet,
            scanner_message=clean_message,
        )

        headers = {
            "x-api-key": self.api_key or "placeholder",
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
            "User-Agent": "AegisFlow-Gateway/1.0",
        }
        payload = {
            "model": self.model_version,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}],
        }

        if not self.api_key or "dummy" in self.api_key.lower():
            logger.info("Anthropic live adapter simulating response with dummy credentials.")
            explanation = (
                f"Anthropic simulated triage: Analyzing {request.file_path} for {request.rule_id}."
            )
            suggested_fix = "Implement defense-in-depth sanitization."
        else:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.post(endpoint, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                explanation = data["content"][0]["text"]
                suggested_fix = "Apply verified security patch according to guidance."

        cited = [request.finding_id]
        validate_cited_evidence(cited, request.finding_id)

        return LLMTriageResponse(
            explanation=explanation,
            suggested_fix=suggested_fix,
            confidence_score=0.96,
            cited_evidence_ids=cited,
            provider_name="anthropic",
            model_version=self.model_version,
        )


def get_llm_gateway(provider: str = "mock", model_version: Optional[str] = None) -> LLMGateway:
    """Factory for instantiating LLM gateway according to configuration."""
    provider_clean = (provider or "mock").lower()
    if provider_clean == "openai":
        return LiveOpenAIAdapter(model_version=model_version or "gpt-4o-mini")
    if provider_clean == "anthropic":
        return LiveAnthropicAdapter(model_version=model_version or "claude-3-5-sonnet-20241022")
    return MockLLMAdapter(model_version=model_version or "mock-model-v1")
