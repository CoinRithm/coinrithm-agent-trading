from enum import Enum


class PublicPmOutcomeSourceObservationType0Basis(str, Enum):
    CLEARING_SETTLEMENT = "clearing_settlement"
    DAILY_CLEARING_MARK = "daily_clearing_mark"
    LAST_PRICE_UNTIMED = "last_price_untimed"
    PROVIDER_QUOTE = "provider_quote"
    PROVIDER_TRADE = "provider_trade"

    def __str__(self) -> str:
        return str(self.value)
