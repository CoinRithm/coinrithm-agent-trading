from enum import Enum


class PublicPmEventHoldersResponseReason(str, Enum):
    BUSY = "busy"
    MARKET_IDS_UNAVAILABLE = "market_ids_unavailable"
    VENUE_HAS_NO_PUBLIC_HOLDERS = "venue_has_no_public_holders"
    VENUE_NOT_SUPPORTED = "venue_not_supported"
    VENUE_UNAVAILABLE = "venue_unavailable"

    def __str__(self) -> str:
        return str(self.value)
