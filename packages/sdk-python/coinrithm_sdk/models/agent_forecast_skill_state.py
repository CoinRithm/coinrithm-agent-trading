from enum import Enum

class AgentForecastSkillState(str, Enum):
    INSUFFICIENT_DATA = "insufficient_data"
    RANKED = "ranked"

    def __str__(self) -> str:
        return str(self.value)
