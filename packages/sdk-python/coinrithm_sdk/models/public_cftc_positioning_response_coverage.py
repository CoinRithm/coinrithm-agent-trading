from enum import Enum


class PublicCftcPositioningResponseCoverage(str, Enum):
    AVAILABLE = "available"
    NOT_APPLICABLE = "not_applicable"

    def __str__(self) -> str:
        return str(self.value)
