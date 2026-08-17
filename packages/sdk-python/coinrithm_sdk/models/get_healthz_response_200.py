from enum import Enum


class GetHealthzResponse200(str, Enum):
    OK = "ok"

    def __str__(self) -> str:
        return str(self.value)
