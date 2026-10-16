from apps.api.models import AssetCriticality, Severity
from packages.policy.prioritization import PRIORITIZATION_ENGINE_VERSION, calculate_risk_score


def test_deterministic_scoring_consistency():
    """
    Phase 3 Acceptance Criteria:
    - Every score shows contributing factors and scoring version.
    - Deterministic: same inputs yield exact same score every time.
    """
    res1 = calculate_risk_score(
        severity=Severity.HIGH,
        asset_criticality=AssetCriticality.CRITICAL,
        is_cisa_kev=True,
        epss_score=0.6,
        reachability="DIRECT",
        internet_exposed=True,
    )
    res2 = calculate_risk_score(
        severity=Severity.HIGH,
        asset_criticality=AssetCriticality.CRITICAL,
        is_cisa_kev=True,
        epss_score=0.6,
        reachability="DIRECT",
        internet_exposed=True,
    )

    assert res1.score == res2.score
    assert res1.engine_version == PRIORITIZATION_ENGINE_VERSION
    assert res1.priority_band == "CRITICAL"
    assert len(res1.factors) == 6
    assert len(res1.missing_context_factors) == 0


def test_missing_context_explicitly_flagged():
    """
    Phase 3 Acceptance Criteria:
    - Explicit handling of missing context.
    - Missing data is visible instead of silently treated as safe.
    """
    res = calculate_risk_score(
        severity=Severity.MEDIUM,
        # Omit asset criticality, reachability, and CISA KEV
    )

    assert len(res.missing_context_factors) >= 3
    assert "asset_criticality" in res.missing_context_factors
    assert "cisa_kev_status" in res.missing_context_factors
    assert "call_reachability" in res.missing_context_factors

    # Verify factors mark is_missing = True
    missing_factors = [f for f in res.factors if f.is_missing_context]
    assert len(missing_factors) >= 3
