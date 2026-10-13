from enum import Enum


class AgentUniverseSectorTier(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"

    def __str__(self) -> str:
        return str(self.value)
