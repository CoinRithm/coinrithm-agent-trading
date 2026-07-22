from enum import Enum

class AgentRunOutcomeSummaryCoverage(str, Enum):
    COMPLETE = "complete"
    NONE = "none"
    PARTIAL = "partial"

    def __str__(self) -> str:
        return str(self.value)
