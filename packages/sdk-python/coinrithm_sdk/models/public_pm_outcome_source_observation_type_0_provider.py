from enum import Enum


class PublicPmOutcomeSourceObservationType0Provider(str, Enum):
    FORECASTEX = "forecastex"
    ROBINHOOD = "robinhood"
    ROTHERA = "rothera"

    def __str__(self) -> str:
        return str(self.value)
