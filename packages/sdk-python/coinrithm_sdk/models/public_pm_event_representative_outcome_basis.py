from enum import Enum


class PublicPmEventRepresentativeOutcomeBasis(str, Enum):
    INFORMATIVE_LEADER = "informative_leader"
    THRESHOLD_LADDER_LINE = "threshold_ladder_line"

    def __str__(self) -> str:
        return str(self.value)
