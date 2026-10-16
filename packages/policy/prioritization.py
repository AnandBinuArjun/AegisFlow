from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from apps.api.models import AssetCriticality, Severity

PRIORITIZATION_ENGINE_VERSION = "v1.0.0-deterministic"


@dataclass
class RiskFactor:
    name: str
    weight: float
    value: Any
    is_missing_context: bool
    description: str


@dataclass
class PrioritizationResult:
    score: float  # 0.0 to 100.0
    priority_band: str  # CRITICAL, HIGH, MEDIUM, LOW
    engine_version: str
    factors: List[RiskFactor]
    missing_context_factors: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": round(self.score, 1),
            "priority_band": self.priority_band,
            "engine_version": self.engine_version,
            "missing_context_factors": self.missing_context_factors,
            "factors": [
                {
                    "name": f.name,
                    "weight": f.weight,
                    "value": f.value,
                    "is_missing": f.is_missing_context,
                    "description": f.description,
                }
                for f in self.factors
            ],
        }


def calculate_risk_score(
    severity: Severity,
    asset_criticality: Optional[AssetCriticality] = None,
    is_cisa_kev: Optional[bool] = None,
    epss_score: Optional[float] = None,
    reachability: Optional[str] = None,  # DIRECT, INDIRECT, UNREACHABLE, UNKNOWN
    internet_exposed: Optional[bool] = None,
) -> PrioritizationResult:
    """
    Deterministic explainable risk calculation.
    Explicitly accounts for missing context without silently assuming safety.
    """
    factors: List[RiskFactor] = []
    missing_context: List[str] = []

    # 1. Base Severity (Weight 0 - 35)
    sev_map = {
        Severity.CRITICAL: 35.0,
        Severity.HIGH: 25.0,
        Severity.MEDIUM: 15.0,
        Severity.LOW: 5.0,
        Severity.INFO: 1.0,
    }
    base_score = sev_map.get(severity, 15.0)
    factors.append(
        RiskFactor(
            name="base_severity",
            weight=base_score,
            value=severity.value,
            is_missing_context=False,
            description=f"Scanner baseline severity rating ({severity.value}).",
        )
    )

    # 2. Asset Criticality (Multiplier 0.7 - 1.5)
    crit_mult = 1.0
    if asset_criticality is None:
        missing_context.append("asset_criticality")
        crit_val = "UNKNOWN (defaulting to MEDIUM)"
        is_crit_missing = True
    else:
        is_crit_missing = False
        crit_val = asset_criticality.value
        if asset_criticality == AssetCriticality.CRITICAL:
            crit_mult = 1.5
        elif asset_criticality == AssetCriticality.HIGH:
            crit_mult = 1.25
        elif asset_criticality == AssetCriticality.MEDIUM:
            crit_mult = 1.0
        elif asset_criticality == AssetCriticality.LOW:
            crit_mult = 0.75

    factors.append(
        RiskFactor(
            name="asset_criticality",
            weight=crit_mult,
            value=crit_val,
            is_missing_context=is_crit_missing,
            description=f"Criticality of host asset/repository ({crit_val}).",
        )
    )

    # 3. Known Exploitation / CISA KEV (Bonus 0 - 25)
    kev_bonus = 0.0
    if is_cisa_kev is None:
        missing_context.append("cisa_kev_status")
        kev_val = "UNKNOWN"
        is_kev_missing = True
    else:
        is_kev_missing = False
        kev_val = "CONFIRMED" if is_cisa_kev else "NONE"
        if is_cisa_kev:
            kev_bonus = 25.0

    factors.append(
        RiskFactor(
            name="known_active_exploitation",
            weight=kev_bonus,
            value=kev_val,
            is_missing_context=is_kev_missing,
            description="Active wild exploitation signal (CISA KEV).",
        )
    )

    # 4. Exploit Probability (EPSS Bonus 0 - 15)
    epss_bonus = 0.0
    if epss_score is None:
        missing_context.append("epss_score")
        epss_val = "UNKNOWN"
        is_epss_missing = True
    else:
        is_epss_missing = False
        epss_val = f"{epss_score:.3f}"
        if epss_score >= 0.5:
            epss_bonus = 15.0
        elif epss_score >= 0.2:
            epss_bonus = 10.0
        elif epss_score >= 0.05:
            epss_bonus = 5.0

    factors.append(
        RiskFactor(
            name="exploit_probability_signal",
            weight=epss_bonus,
            value=epss_val,
            is_missing_context=is_epss_missing,
            description="Empirical exploit probability prediction (EPSS).",
        )
    )

    # 5. Reachability (Modifier 0.6 - 1.25)
    reach_mult = 1.0
    if reachability is None or reachability.strip().upper() == "UNKNOWN":
        missing_context.append("call_reachability")
        reach_val = "UNKNOWN"
        is_reach_missing = True
    else:
        is_reach_missing = False
        reach_val = reachability.strip().upper()
        if reach_val == "DIRECT":
            reach_mult = 1.25
        elif reach_val == "INDIRECT":
            reach_mult = 1.0
        elif reach_val == "UNREACHABLE":
            reach_mult = 0.6

    factors.append(
        RiskFactor(
            name="call_reachability",
            weight=reach_mult,
            value=reach_val,
            is_missing_context=is_reach_missing,
            description="Static call-graph reachability of vulnerable symbol.",
        )
    )

    # 6. Internet Exposure (Modifier 0.8 - 1.3)
    exp_mult = 1.0
    is_exp_missing = internet_exposed is None
    if is_exp_missing:
        missing_context.append("network_exposure")
        exp_val = "UNKNOWN"
    else:
        exp_val = "INTERNET_FACING" if internet_exposed else "INTERNAL_ONLY"
        exp_mult = 1.3 if internet_exposed else 0.8

    factors.append(
        RiskFactor(
            name="network_exposure",
            weight=exp_mult,
            value=exp_val,
            is_missing_context=is_exp_missing,
            description="Network routing exposure of application service.",
        )
    )

    # Calculation: (base * crit_mult * reach_mult * exp_mult) + kev_bonus + epss_bonus
    calculated_score = (base_score * crit_mult * reach_mult * exp_mult) + kev_bonus + epss_bonus
    clamped_score = max(0.0, min(100.0, calculated_score))

    # Priority Band
    if clamped_score >= 80.0:
        band = "CRITICAL"
    elif clamped_score >= 60.0:
        band = "HIGH"
    elif clamped_score >= 35.0:
        band = "MEDIUM"
    else:
        band = "LOW"

    return PrioritizationResult(
        score=clamped_score,
        priority_band=band,
        engine_version=PRIORITIZATION_ENGINE_VERSION,
        factors=factors,
        missing_context_factors=missing_context,
    )
