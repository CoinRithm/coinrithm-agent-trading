from enum import Enum

class AgentForecastSkillBasis(str, Enum):
    AGENT_FORECAST = "agent_forecast"

    def __str__(self) -> str:
        return str(self.value)
