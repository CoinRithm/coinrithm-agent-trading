from enum import Enum


class PmDiscoveryOutcomeRuleBasis(str, Enum):
    PROVIDER_MARKET_RULES = "provider_market_rules"

    def __str__(self) -> str:
        return str(self.value)
