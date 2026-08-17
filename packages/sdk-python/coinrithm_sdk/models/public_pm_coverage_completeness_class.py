from enum import Enum


class PublicPmCoverageCompletenessClass(str, Enum):
    OPEN_SWEEP_BOUNDED = "open_sweep_bounded"
    OPEN_SWEEP_EXHAUSTED = "open_sweep_exhausted"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
