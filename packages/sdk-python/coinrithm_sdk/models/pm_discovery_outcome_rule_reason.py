from enum import Enum


class PmDiscoveryOutcomeRuleReason(str, Enum):
    CONFLICTING_DUPLICATES = "conflicting_duplicates"
    MARKET_NOT_FOUND = "market_not_found"
    RULE_MISSING = "rule_missing"

    def __str__(self) -> str:
        return str(self.value)
