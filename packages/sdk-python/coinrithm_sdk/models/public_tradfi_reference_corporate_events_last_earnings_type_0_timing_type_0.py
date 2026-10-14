from enum import Enum


class PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0(str, Enum):
    AFTER_CLOSE = "after_close"
    BEFORE_OPEN = "before_open"
    DURING_MARKET = "during_market"

    def __str__(self) -> str:
        return str(self.value)
