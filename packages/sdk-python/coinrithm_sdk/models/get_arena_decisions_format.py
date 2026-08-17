from enum import Enum


class GetArenaDecisionsFormat(str, Enum):
    JSON = "json"
    JSONL = "jsonl"

    def __str__(self) -> str:
        return str(self.value)
