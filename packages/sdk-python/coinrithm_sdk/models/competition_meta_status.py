from enum import Enum

class CompetitionMetaStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    UPCOMING = "upcoming"

    def __str__(self) -> str:
        return str(self.value)
