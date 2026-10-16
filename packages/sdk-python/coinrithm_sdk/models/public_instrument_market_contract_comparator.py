from enum import Enum


class PublicInstrumentMarketContractComparator(str, Enum):
    BETWEEN = "between"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    TOUCH_DOWN = "touch_down"
    TOUCH_UP = "touch_up"

    def __str__(self) -> str:
        return str(self.value)
