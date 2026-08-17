from enum import Enum


class ScorecardRunCohortUniverse(str, Enum):
    ALL = "all"

    def __str__(self) -> str:
        return str(self.value)
