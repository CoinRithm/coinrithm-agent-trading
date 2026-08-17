from enum import Enum


class GetCandlesResponse200Range(str, Enum):
    VALUE_0 = "1H"
    VALUE_1 = "1D"
    VALUE_2 = "1W"
    VALUE_3 = "1M"
    VALUE_4 = "3M"

    def __str__(self) -> str:
        return str(self.value)
