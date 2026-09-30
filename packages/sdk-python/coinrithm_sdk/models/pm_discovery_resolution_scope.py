from enum import Enum


class PmDiscoveryResolutionScope(str, Enum):
    PER_OUTCOME = "per_outcome"

    def __str__(self) -> str:
        return str(self.value)
