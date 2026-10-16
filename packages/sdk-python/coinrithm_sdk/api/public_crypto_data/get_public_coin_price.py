from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_coin_price import PublicCoinPrice
from ...models.public_message_error import PublicMessageError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    slug: str,
    *,
    fiat: str | Unset = "USD",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["fiat"] = fiat

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/coins/{slug}/price".format(
            slug=quote(str(slug), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicCoinPrice | PublicMessageError | None:
    if response.status_code == 200:
        response_200 = PublicCoinPrice.from_dict(response.json())

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
) -> Response[Error | PublicCoinPrice | PublicMessageError]:
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
) -> Response[Error | PublicCoinPrice | PublicMessageError]:
    r"""One coin's price snapshot (lightweight)

     Keyless price-only subset of `/api/coins/{slug}` for polling: the
    same price, change, volume, market-cap, all-time high/low, supply
    and BTC/ETH ratio fields with the same decimal-string numerics and
    the same `fiat` behaviour, without links, chains, categories,
    notices, `volumeMissingVenues` or watchlist counts.

    `priceUpdatedAt` here is the write time of the coin's price-summary
    row, and `priceAgeHours`/`priceStale` derive from it. A periodic
    recompute can rewrite that row without a new price, so `priceStale`
    can read false for a price whose feed has stopped. For a staleness
    decision read `/api/coins/{slug}` or `/api/live-prices`, whose
    `priceUpdatedAt` is the live-price write time, and check
    `marketCapSuspect`.

    Query parameters other than `fiat` are ignored. Unknown slug, or a
    coin with no price summary: 404 `{\"message\": \"not_found\"}`. Also
    served at `/api/v1/coins/{slug}/price` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinPrice | PublicMessageError]
    """

    kwargs = _get_kwargs(
        slug=slug,
        fiat=fiat,
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
) -> Error | PublicCoinPrice | PublicMessageError | None:
    r"""One coin's price snapshot (lightweight)

     Keyless price-only subset of `/api/coins/{slug}` for polling: the
    same price, change, volume, market-cap, all-time high/low, supply
    and BTC/ETH ratio fields with the same decimal-string numerics and
    the same `fiat` behaviour, without links, chains, categories,
    notices, `volumeMissingVenues` or watchlist counts.

    `priceUpdatedAt` here is the write time of the coin's price-summary
    row, and `priceAgeHours`/`priceStale` derive from it. A periodic
    recompute can rewrite that row without a new price, so `priceStale`
    can read false for a price whose feed has stopped. For a staleness
    decision read `/api/coins/{slug}` or `/api/live-prices`, whose
    `priceUpdatedAt` is the live-price write time, and check
    `marketCapSuspect`.

    Query parameters other than `fiat` are ignored. Unknown slug, or a
    coin with no price summary: 404 `{\"message\": \"not_found\"}`. Also
    served at `/api/v1/coins/{slug}/price` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinPrice | PublicMessageError
    """

    return sync_detailed(
        slug=slug,
        client=client,
        fiat=fiat,
    ).parsed


async def asyncio_detailed(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicCoinPrice | PublicMessageError]:
    r"""One coin's price snapshot (lightweight)

     Keyless price-only subset of `/api/coins/{slug}` for polling: the
    same price, change, volume, market-cap, all-time high/low, supply
    and BTC/ETH ratio fields with the same decimal-string numerics and
    the same `fiat` behaviour, without links, chains, categories,
    notices, `volumeMissingVenues` or watchlist counts.

    `priceUpdatedAt` here is the write time of the coin's price-summary
    row, and `priceAgeHours`/`priceStale` derive from it. A periodic
    recompute can rewrite that row without a new price, so `priceStale`
    can read false for a price whose feed has stopped. For a staleness
    decision read `/api/coins/{slug}` or `/api/live-prices`, whose
    `priceUpdatedAt` is the live-price write time, and check
    `marketCapSuspect`.

    Query parameters other than `fiat` are ignored. Unknown slug, or a
    coin with no price summary: 404 `{\"message\": \"not_found\"}`. Also
    served at `/api/v1/coins/{slug}/price` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinPrice | PublicMessageError]
    """

    kwargs = _get_kwargs(
        slug=slug,
        fiat=fiat,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Error | PublicCoinPrice | PublicMessageError | None:
    r"""One coin's price snapshot (lightweight)

     Keyless price-only subset of `/api/coins/{slug}` for polling: the
    same price, change, volume, market-cap, all-time high/low, supply
    and BTC/ETH ratio fields with the same decimal-string numerics and
    the same `fiat` behaviour, without links, chains, categories,
    notices, `volumeMissingVenues` or watchlist counts.

    `priceUpdatedAt` here is the write time of the coin's price-summary
    row, and `priceAgeHours`/`priceStale` derive from it. A periodic
    recompute can rewrite that row without a new price, so `priceStale`
    can read false for a price whose feed has stopped. For a staleness
    decision read `/api/coins/{slug}` or `/api/live-prices`, whose
    `priceUpdatedAt` is the live-price write time, and check
    `marketCapSuspect`.

    Query parameters other than `fiat` are ignored. Unknown slug, or a
    coin with no price summary: 404 `{\"message\": \"not_found\"}`. Also
    served at `/api/v1/coins/{slug}/price` with identical behaviour.

    Args:
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinPrice | PublicMessageError
    """

    return (
        await asyncio_detailed(
            slug=slug,
            client=client,
            fiat=fiat,
        )
    ).parsed
