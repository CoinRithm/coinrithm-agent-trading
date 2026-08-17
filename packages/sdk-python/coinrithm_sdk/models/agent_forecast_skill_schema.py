from enum import Enum


class AgentForecastSkillSchema(str, Enum):
    COINRITHM_AGENT_FORECASTSKILL_V1 = "coinrithm.agent.forecastSkill.v1"

    def __str__(self) -> str:
        return str(self.value)
