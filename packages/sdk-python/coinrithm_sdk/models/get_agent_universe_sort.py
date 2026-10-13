from enum import Enum


class GetAgentUniverseSort(str, Enum):
    ABS_CHANGE_1H = "abs_change_1h"
    ABS_CHANGE_24H = "abs_change_24h"
    GAINERS_24H = "gainers_24h"
    LOSERS_24H = "losers_24h"
    RANK = "rank"
    VOLUME_24H = "volume_24h"

    def __str__(self) -> str:
        return str(self.value)
