from enum import Enum


class PublicInstrumentMarketsReferenceKind(str, Enum):
    COIN_LIVE_PRICE = "coin_live_price"
    MACRO_PROXY = "macro_proxy"
    TRADFI_REFERENCE = "tradfi_reference"

    def __str__(self) -> str:
        return str(self.value)
