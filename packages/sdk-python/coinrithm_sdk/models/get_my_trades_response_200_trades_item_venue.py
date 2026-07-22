from enum import Enum

class GetMyTradesResponse200TradesItemVenue(str, Enum):
    FUTURES = "futures"
    PM = "pm"
    SPOT = "spot"

    def __str__(self) -> str:
        return str(self.value)
