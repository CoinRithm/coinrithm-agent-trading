from enum import IntEnum


class PublicPmWhalesResponseMinUsd(IntEnum):
    VALUE_25000 = 25000
    VALUE_50000 = 50000
    VALUE_100000 = 100000

    def __str__(self) -> str:
        return str(self.value)
