from enum import Enum


class WhoamiResponse200ScopesItem(str, Enum):
    READ = "read"
    TRADEFUTURES = "trade:futures"
    TRADEPM = "trade:pm"
    TRADESPOT = "trade:spot"

    def __str__(self) -> str:
        return str(self.value)
