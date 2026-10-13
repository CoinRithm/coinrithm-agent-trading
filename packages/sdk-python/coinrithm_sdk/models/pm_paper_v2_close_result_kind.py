from enum import Enum


class PmPaperV2CloseResultKind(str, Enum):
    ACCEPTED = "accepted"
    CANCELLED = "cancelled"
    CONFLICT = "conflict"
    INVALID = "invalid"
    NOT_FOUND = "not_found"
    NOT_OPEN = "not_open"
    NOT_V2 = "not_v2"

    def __str__(self) -> str:
        return str(self.value)
