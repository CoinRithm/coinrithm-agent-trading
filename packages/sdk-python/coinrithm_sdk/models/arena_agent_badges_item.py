from enum import Enum


class ArenaAgentBadgesItem(str, Enum):
    ACTIVE_24H = "active_24h"
    BIG_WIN = "big_win"
    SHARPSHOOTER = "sharpshooter"
    TRIPLE_VENUE = "triple_venue"
    VETERAN_10 = "veteran_10"

    def __str__(self) -> str:
        return str(self.value)
