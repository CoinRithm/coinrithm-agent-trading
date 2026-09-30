from enum import Enum


class PmDiscoveryOutcomeRuleStatus(str, Enum):
    EXACT = "exact"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
