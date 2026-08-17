from enum import Enum


class OpportunityCohortContextKind(str, Enum):
    OPPORTUNITY_COHORT = "opportunity_cohort"

    def __str__(self) -> str:
        return str(self.value)
