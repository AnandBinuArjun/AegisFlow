import pytest

from packages.connectors.llm_gateway import (
    LLMTriageRequest,
    LLMTriageResponse,
    MockLLMAdapter,
    get_llm_gateway,
)


@pytest.mark.asyncio
async def test_app_functions_without_external_llm():
    """
    Core Product Principle:
    AegisFlow must function reliably without requiring any external LLM provider or credentials.
    """
    gateway = get_llm_gateway(provider="mock")
    assert isinstance(gateway, MockLLMAdapter)

    request = LLMTriageRequest(
        finding_id="test-finding-001",
        rule_id="python.lang.security.injection.sql",
        severity="HIGH",
        file_path="src/handlers/users.py",
        scanner_message="User input formatted directly into SQL query.",
    )

    response = await gateway.generate_triage(request)
    assert isinstance(response, LLMTriageResponse)
    assert response.confidence_score > 0.0
    assert "test-finding-001" in response.cited_evidence_ids
    assert response.provider_name == "mock"
    assert response.model_version is not None
