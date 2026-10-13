from enum import Enum


class GetPmPaperV2PositionsStatus(str, Enum):
    OPEN = "open"

    def __str__(self) -> str:
        return str(self.value)
