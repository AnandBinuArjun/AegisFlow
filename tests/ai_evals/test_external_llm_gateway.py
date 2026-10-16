import pytest

from packages.connectors.llm_gateway import (
    LiveAnthropicAdapter,
    LiveOpenAIAdapter,
    LLMTriageRequest,
    get_llm_gateway,
)
from packages.policy.ssrf_defense import SSRFViolationError


@pytest.mark.asyncio
async def test_openai_adapter_blocks_ssrf():
    """
    Verify LiveOpenAIAdapter enforces SSRF outbound defense against metadata / loopback targets.
    """
    # 1. Attacker sets base_url to AWS metadata IP
    malicious_adapter = LiveOpenAIAdapter(
        api_key="sk-dummy-key",
        base_url="http://169.254.169.254/latest",
    )

    req = LLMTriageRequest(
        finding_id="fnd-100",
        rule_id="python.sql-injection",
        severity="HIGH",
        file_path="src/db.py",
        scanner_message="raw SQL string",
    )

    with pytest.raises(SSRFViolationError) as exc:
        await malicious_adapter.generate_triage(req)
    assert "cloud metadata" in str(exc.value)

    # 2. Attacker sets base_url to internal loopback
    loopback_adapter = LiveOpenAIAdapter(
        api_key="sk-dummy-key",
        base_url="http://127.0.0.1:8080/v1",
    )
    with pytest.raises(SSRFViolationError) as exc2:
        await loopback_adapter.generate_triage(req)
    assert "internal network boundary" in str(exc2.value)


@pytest.mark.asyncio
async def test_anthropic_adapter_blocks_ssrf():
    """Verify LiveAnthropicAdapter enforces SSRF outbound defense."""
    malicious_adapter = LiveAnthropicAdapter(
        api_key="ant-dummy-key",
        base_url="http://10.0.0.1:8080/v1",
    )

    req = LLMTriageRequest(
        finding_id="fnd-101",
        rule_id="crypto.weak-hash",
        severity="MEDIUM",
        file_path="src/hash.py",
        scanner_message="MD5 used",
    )

    with pytest.raises(SSRFViolationError) as exc:
        await malicious_adapter.generate_triage(req)
    assert "internal network boundary" in str(exc.value)


@pytest.mark.asyncio
async def test_live_adapters_safe_offline_execution_and_citations():
    """Verify live adapters function safely with dummy credentials and validate cited evidence."""
    req = LLMTriageRequest(
        finding_id="fnd-safe-1",
        rule_id="test.rule.id",
        severity="HIGH",
        file_path="apps/api/views.py",
        code_snippet="api_key = 'AKIAIOSFODNN7EXAMPLE'\nquery = 'SELECT 1'",
        scanner_message="Hardcoded AWS key and SQL query",
    )

    # OpenAI Adapter
    openai_adapter = LiveOpenAIAdapter(
        api_key="sk-dummy-test-key",
        base_url="https://api.openai.com/v1",
    )
    res_openai = await openai_adapter.generate_triage(req)
    assert res_openai.provider_name == "openai"
    assert res_openai.cited_evidence_ids == ["fnd-safe-1"]
    assert res_openai.confidence_score >= 0.9

    # Anthropic Adapter
    anthropic_adapter = LiveAnthropicAdapter(
        api_key="ant-dummy-test-key",
        base_url="https://api.anthropic.com/v1",
    )
    res_anthropic = await anthropic_adapter.generate_triage(req)
    assert res_anthropic.provider_name == "anthropic"
    assert res_anthropic.cited_evidence_ids == ["fnd-safe-1"]


def test_llm_gateway_factory():
    """Verify provider factory returns appropriate adapter instances."""
    mock_gw = get_llm_gateway("mock")
    assert mock_gw.__class__.__name__ == "MockLLMAdapter"

    openai_gw = get_llm_gateway("openai")
    assert openai_gw.__class__.__name__ == "LiveOpenAIAdapter"

    anthropic_gw = get_llm_gateway("anthropic")
    assert anthropic_gw.__class__.__name__ == "LiveAnthropicAdapter"
