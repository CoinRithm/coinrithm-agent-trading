from enum import Enum


class SpotOrderResponseSummaryExecutionModelStatus(str, Enum):
    HISTORICAL_PARAMETERS_NOT_RETAINED = "historical_parameters_not_retained"

    def __str__(self) -> str:
        return str(self.value)
