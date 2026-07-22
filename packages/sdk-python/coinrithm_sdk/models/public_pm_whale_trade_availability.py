from enum import Enum

class PublicPmWhaleTradeAvailability(str, Enum):
    DELAYED = "delayed"
    LIVE = "live"
    UNAVAILABLE = "unavailable"

    def __str__(self) -> str:
        return str(self.value)
