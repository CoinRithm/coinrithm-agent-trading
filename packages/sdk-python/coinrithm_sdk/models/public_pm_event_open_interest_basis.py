from enum import Enum


class PublicPmEventOpenInterestBasis(str, Enum):
    CONTRACTS_X_NOTIONAL_USD = "contracts_x_notional_usd"
    VENUE_REPORTED_USD = "venue_reported_usd"

    def __str__(self) -> str:
        return str(self.value)
