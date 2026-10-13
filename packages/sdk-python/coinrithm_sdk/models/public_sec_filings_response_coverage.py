from enum import Enum


class PublicSecFilingsResponseCoverage(str, Enum):
    AVAILABLE = "available"
    NONE_RECORDED = "none_recorded"
    NOT_APPLICABLE = "not_applicable"

    def __str__(self) -> str:
        return str(self.value)
