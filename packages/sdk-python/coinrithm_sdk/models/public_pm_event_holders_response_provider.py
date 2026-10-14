from enum import Enum


class PublicPmEventHoldersResponseProvider(str, Enum):
    POLYMARKET_DATA_API_V2 = "polymarket_data_api_v2"

    def __str__(self) -> str:
        return str(self.value)
