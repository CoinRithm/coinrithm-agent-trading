from enum import Enum


class PmPaperV2OpenRequestSide(str, Enum):
    NO = "no"
    YES = "yes"

    def __str__(self) -> str:
        return str(self.value)
