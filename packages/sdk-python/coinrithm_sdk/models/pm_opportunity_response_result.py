from enum import Enum


class PmOpportunityResponseResult(str, Enum):
    ABSTAINED = "abstained"
    QUOTED = "quoted"
    REJECTED = "rejected"

    def __str__(self) -> str:
        return str(self.value)
