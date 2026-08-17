from enum import Enum


class PublicPmSourceSlug(str, Enum):
    FORECASTEX = "forecastex"
    FUTUUR = "futuur"
    GEMINI = "gemini"
    KALSHI = "kalshi"
    LIMITLESS = "limitless"
    MANIFOLD = "manifold"
    METACULUS = "metaculus"
    MYRIAD = "myriad"
    POLYMARKET = "polymarket"
    PREDICTIT = "predictit"
    ROTHERA = "rothera"
    SMARKETS = "smarkets"

    def __str__(self) -> str:
        return str(self.value)
