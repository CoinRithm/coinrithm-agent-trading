from enum import Enum


class ListPublicCoinsView(str, Enum):
    FULL = "full"
    OPTIONS = "options"

    def __str__(self) -> str:
        return str(self.value)
