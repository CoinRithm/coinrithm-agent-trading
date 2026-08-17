from enum import Enum


class GetArenaLeaderboardResponse200Source(str, Enum):
    DEMO = "demo"
    LIVE = "live"

    def __str__(self) -> str:
        return str(self.value)
