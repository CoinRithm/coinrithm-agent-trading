from enum import Enum


class GetPublicTradfiReferenceWindow(str, Enum):
    VALUE_0 = "24h"
    VALUE_1 = "7d"

    def __str__(self) -> str:
        return str(self.value)
