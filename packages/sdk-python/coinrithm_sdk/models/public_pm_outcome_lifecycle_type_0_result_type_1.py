from enum import Enum


class PublicPmOutcomeLifecycleType0ResultType1(str, Enum):
    LOST = "lost"
    VOIDED = "voided"
    WON = "won"

    def __str__(self) -> str:
        return str(self.value)
