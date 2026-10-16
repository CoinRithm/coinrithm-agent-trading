from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_coin_detail import PublicCoinDetail
from ...models.public_message_error import PublicMessageError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    slug: str,
    *,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["fiat"] = fiat

    params["locale"] = locale

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/coins/{slug}".format(
            slug=quote(str(slug), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicCoinDetail | PublicMessageError | None:
    if response.status_code == 200:
        response_200 = PublicCoinDetail.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = PublicMessageError.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicCoinDetail | PublicMessageError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> Response[Error | PublicCoinDetail | PublicMessageError]:
    r"""One coin's price, market data, supply and links

     Keyless coin profile: price in USD and in `fiat`, 24h change, 24h
    high and low, volume, market cap, all-time high and low, supply,
    BTC and ETH ratios, links, chains, categories and notices.

    Market and supply numerics are decimal STRINGS (numeric columns),
    not JSON numbers: parse before comparing. `currentPriceUsd` is
    always USD. `currentPrice`, `volume24h`, `marketCap`, `high24h`,
    `low24h`, `athUsd` and `atlUsd` are converted to `fiat` (the last
    two despite their names); percentages and ratios are unitless.

    `priceUpdatedAt` is when the coin's live price was last written.
    `priceStale: true` means that is more than `priceStaleAfterHours`
    (72) ago: the price is kept as the last known value, never hidden.
    `marketCapSuspect: true` flags a market cap CoinRithm does not trust
    (`marketCapSuspectReason`, for example `stale_dead_pair`). A coin
    without a live price (typically an inactive listing) answers 200
    with the price fields, `priceUpdatedAt` and `marketCapSuspect` null
    and `priceStale: false`.

    Query parameters other than `fiat` and `locale` are ignored. Unknown
    slug: 404 `{\"message\": \"not_found\"}`. Also served at
    `/api/v1/coins/{slug}` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinDetail | PublicMessageError]
    """

    kwargs = _get_kwargs(
        slug=slug,
        fiat=fiat,
        locale=locale,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> Error | PublicCoinDetail | PublicMessageError | None:
    r"""One coin's price, market data, supply and links

     Keyless coin profile: price in USD and in `fiat`, 24h change, 24h
    high and low, volume, market cap, all-time high and low, supply,
    BTC and ETH ratios, links, chains, categories and notices.

    Market and supply numerics are decimal STRINGS (numeric columns),
    not JSON numbers: parse before comparing. `currentPriceUsd` is
    always USD. `currentPrice`, `volume24h`, `marketCap`, `high24h`,
    `low24h`, `athUsd` and `atlUsd` are converted to `fiat` (the last
    two despite their names); percentages and ratios are unitless.

    `priceUpdatedAt` is when the coin's live price was last written.
    `priceStale: true` means that is more than `priceStaleAfterHours`
    (72) ago: the price is kept as the last known value, never hidden.
    `marketCapSuspect: true` flags a market cap CoinRithm does not trust
    (`marketCapSuspectReason`, for example `stale_dead_pair`). A coin
    without a live price (typically an inactive listing) answers 200
    with the price fields, `priceUpdatedAt` and `marketCapSuspect` null
    and `priceStale: false`.

    Query parameters other than `fiat` and `locale` are ignored. Unknown
    slug: 404 `{\"message\": \"not_found\"}`. Also served at
    `/api/v1/coins/{slug}` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinDetail | PublicMessageError
    """

    return sync_detailed(
        slug=slug,
        client=client,
        fiat=fiat,
        locale=locale,
    ).parsed


async def asyncio_detailed(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> Response[Error | PublicCoinDetail | PublicMessageError]:
    r"""One coin's price, market data, supply and links

     Keyless coin profile: price in USD and in `fiat`, 24h change, 24h
    high and low, volume, market cap, all-time high and low, supply,
    BTC and ETH ratios, links, chains, categories and notices.

    Market and supply numerics are decimal STRINGS (numeric columns),
    not JSON numbers: parse before comparing. `currentPriceUsd` is
    always USD. `currentPrice`, `volume24h`, `marketCap`, `high24h`,
    `low24h`, `athUsd` and `atlUsd` are converted to `fiat` (the last
    two despite their names); percentages and ratios are unitless.

    `priceUpdatedAt` is when the coin's live price was last written.
    `priceStale: true` means that is more than `priceStaleAfterHours`
    (72) ago: the price is kept as the last known value, never hidden.
    `marketCapSuspect: true` flags a market cap CoinRithm does not trust
    (`marketCapSuspectReason`, for example `stale_dead_pair`). A coin
    without a live price (typically an inactive listing) answers 200
    with the price fields, `priceUpdatedAt` and `marketCapSuspect` null
    and `priceStale: false`.

    Query parameters other than `fiat` and `locale` are ignored. Unknown
    slug: 404 `{\"message\": \"not_found\"}`. Also served at
    `/api/v1/coins/{slug}` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinDetail | PublicMessageError]
    """

    kwargs = _get_kwargs(
        slug=slug,
        fiat=fiat,
        locale=locale,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> Error | PublicCoinDetail | PublicMessageError | None:
    r"""One coin's price, market data, supply and links

     Keyless coin profile: price in USD and in `fiat`, 24h change, 24h
    high and low, volume, market cap, all-time high and low, supply,
    BTC and ETH ratios, links, chains, categories and notices.

    Market and supply numerics are decimal STRINGS (numeric columns),
    not JSON numbers: parse before comparing. `currentPriceUsd` is
    always USD. `currentPrice`, `volume24h`, `marketCap`, `high24h`,
    `low24h`, `athUsd` and `atlUsd` are converted to `fiat` (the last
    two despite their names); percentages and ratios are unitless.

    `priceUpdatedAt` is when the coin's live price was last written.
    `priceStale: true` means that is more than `priceStaleAfterHours`
    (72) ago: the price is kept as the last known value, never hidden.
    `marketCapSuspect: true` flags a market cap CoinRithm does not trust
    (`marketCapSuspectReason`, for example `stale_dead_pair`). A coin
    without a live price (typically an inactive listing) answers 200
    with the price fields, `priceUpdatedAt` and `marketCapSuspect` null
    and `priceStale: false`.

    Query parameters other than `fiat` and `locale` are ignored. Unknown
    slug: 404 `{\"message\": \"not_found\"}`. Also served at
    `/api/v1/coins/{slug}` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinDetail | PublicMessageError
    """

    return (
        await asyncio_detailed(
            slug=slug,
            client=client,
            fiat=fiat,
            locale=locale,
        )
    ).parsed
