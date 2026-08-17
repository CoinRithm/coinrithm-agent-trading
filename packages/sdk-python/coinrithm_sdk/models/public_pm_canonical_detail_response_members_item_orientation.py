from enum import Enum


class PublicPmCanonicalDetailResponseMembersItemOrientation(str, Enum):
    FLIPPED = "flipped"
    SAME = "same"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
