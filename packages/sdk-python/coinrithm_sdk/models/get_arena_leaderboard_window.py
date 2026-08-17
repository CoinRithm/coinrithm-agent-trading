from enum import Enum


class GetArenaLeaderboardWindow(str, Enum):
    ALL = "all"
    TODAY = "today"
    VALUE_1 = "24h"
    VALUE_2 = "7d"
    VALUE_3 = "30d"
    VALUE_4 = "3m"

    def __str__(self) -> str:
        return str(self.value)
