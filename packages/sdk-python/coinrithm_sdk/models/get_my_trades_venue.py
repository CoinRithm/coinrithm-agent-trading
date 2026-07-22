from enum import Enum

class GetMyTradesVenue(str, Enum):
    ALL = "all"
    FUTURES = "futures"
    PM = "pm"
    SPOT = "spot"

    def __str__(self) -> str:
        return str(self.value)
