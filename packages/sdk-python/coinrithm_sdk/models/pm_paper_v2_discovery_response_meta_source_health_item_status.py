from enum import Enum


class PmPaperV2DiscoveryResponseMetaSourceHealthItemStatus(str, Enum):
    FRESH = "fresh"
    NEVER_INGESTED = "never_ingested"
    STALE = "stale"

    def __str__(self) -> str:
        return str(self.value)
