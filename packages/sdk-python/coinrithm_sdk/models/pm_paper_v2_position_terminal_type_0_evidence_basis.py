from enum import Enum


class PmPaperV2PositionTerminalType0EvidenceBasis(str, Enum):
    ACQUIRED_BOOK_FULL_SELL = "acquired_book_full_sell"
    PROVIDER_REPORTED_FINAL_BINARY_PAYOUT = "provider_reported_final_binary_payout"

    def __str__(self) -> str:
        return str(self.value)
