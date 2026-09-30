from enum import Enum


class PmDiscoveryOutcomeRuleReason(str, Enum):
    CONFLICTING_DUPLICATES = "conflicting_duplicates"
    MARKET_NOT_FOUND = "market_not_found"
    RULE_MISSING = "rule_missing"
    SOURCE_RULES_UNAVAILABLE = "source_rules_unavailable"

    def __str__(self) -> str:
        return str(self.value)
