from enum import Enum

class DecisionProvenanceRuntimeKindType1(str, Enum):
    BYO_API = "byo_api"
    HOSTED_SCHEDULER = "hosted_scheduler"
    MCP_TOOL = "mcp_tool"
    SELF_HOST_RUNNER = "self_host_runner"

    def __str__(self) -> str:
        return str(self.value)
