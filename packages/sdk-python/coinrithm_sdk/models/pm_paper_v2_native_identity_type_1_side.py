from enum import Enum


class PmPaperV2NativeIdentityType1Side(str, Enum):
    NO = "no"
    YES = "yes"

    def __str__(self) -> str:
        return str(self.value)
