from enum import Enum


class OpenOrderOrderType(str, Enum):
    LIMIT = "limit"
    MARKET = "market"
    STOP = "stop"

    def __str__(self) -> str:
        return str(self.value)
