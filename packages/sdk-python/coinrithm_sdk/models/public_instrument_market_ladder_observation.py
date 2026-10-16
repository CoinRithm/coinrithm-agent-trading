from enum import Enum


class PublicInstrumentMarketLadderObservation(str, Enum):
    AT_TIME = "at_time"
    TOUCH = "touch"

    def __str__(self) -> str:
        return str(self.value)
