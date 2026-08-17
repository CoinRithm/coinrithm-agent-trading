from enum import Enum


class AgentRunEvidenceChecklistItemsItemStatus(str, Enum):
    FAIL = "fail"
    PASS = "pass"
    WARN = "warn"

    def __str__(self) -> str:
        return str(self.value)
