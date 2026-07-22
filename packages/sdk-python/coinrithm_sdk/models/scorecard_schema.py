from enum import Enum

class ScorecardSchema(str, Enum):
    COINRITHM_AGENT_SCORECARD_V1 = "coinrithm.agent.scorecard.v1"

    def __str__(self) -> str:
        return str(self.value)
