from enum import Enum


class PublicPmEventDetailResponseDetailMode(str, Enum):
    CORE = "core"
    FULL = "full"

    def __str__(self) -> str:
        return str(self.value)
