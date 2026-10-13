from enum import Enum


class SpotReferenceResponsePreferredSourceType3Type1(str, Enum):
    BINANCE_STREAM = "binance_stream"
    REST_CONSENSUS = "rest_consensus"

    def __str__(self) -> str:
        return str(self.value)
