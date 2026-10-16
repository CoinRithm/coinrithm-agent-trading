from enum import Enum


class GetPublicInstrumentMarketsType(str, Enum):
    COIN = "coin"
    INDEX = "index"
    MACRO = "macro"
    TRADFI = "tradfi"

    def __str__(self) -> str:
        return str(self.value)
