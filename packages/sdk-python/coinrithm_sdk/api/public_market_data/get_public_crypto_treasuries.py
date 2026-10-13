from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.public_crypto_treasury_response import PublicCryptoTreasuryResponse
from ...models.public_message_error import PublicMessageError
from ...types import Response


def _get_kwargs(
    coin: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/treasuries/{coin}".format(
            coin=quote(str(coin), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicCryptoTreasuryResponse | PublicMessageError | None:
    if response.status_code == 200:
        response_200 = PublicCryptoTreasuryResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = PublicMessageError.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = PublicMessageError.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | PublicCryptoTreasuryResponse | PublicMessageError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    coin: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | PublicCryptoTreasuryResponse | PublicMessageError]:
    """Public companies holding a coin in treasury

     Keyless list of public companies holding `bitcoin`, `ethereum`,
    `solana` or `binancecoin` (`bnb` is accepted as an alias), largest
    holding first, with the coin-wide totals. Data provided by CoinGecko:
    keep the `source` attribution next to any display of these values.
    The upstream list is read at most every 12 hours and never served
    older than 24 hours. `status` is `fresh` within 12 hours, `stale`
    up to 24 hours, and `unavailable` (null totals, no companies) when
    no usable copy exists; an upstream failure still answers 200.
    `tradfiTicker` links a US-listed company to its
    `/api/market/references/{ticker}` reference when one exists.
    Other coins return 404; any query parameter returns 400.

    Args:
        coin (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicCryptoTreasuryResponse | PublicMessageError]
    """

    kwargs = _get_kwargs(
        coin=coin,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    coin: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | PublicCryptoTreasuryResponse | PublicMessageError | None:
    """Public companies holding a coin in treasury

     Keyless list of public companies holding `bitcoin`, `ethereum`,
    `solana` or `binancecoin` (`bnb` is accepted as an alias), largest
    holding first, with the coin-wide totals. Data provided by CoinGecko:
    keep the `source` attribution next to any display of these values.
    The upstream list is read at most every 12 hours and never served
    older than 24 hours. `status` is `fresh` within 12 hours, `stale`
    up to 24 hours, and `unavailable` (null totals, no companies) when
    no usable copy exists; an upstream failure still answers 200.
    `tradfiTicker` links a US-listed company to its
    `/api/market/references/{ticker}` reference when one exists.
    Other coins return 404; any query parameter returns 400.

    Args:
        coin (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicCryptoTreasuryResponse | PublicMessageError
    """

    return sync_detailed(
        coin=coin,
        client=client,
    ).parsed


async def asyncio_detailed(
    coin: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | PublicCryptoTreasuryResponse | PublicMessageError]:
    """Public companies holding a coin in treasury

     Keyless list of public companies holding `bitcoin`, `ethereum`,
    `solana` or `binancecoin` (`bnb` is accepted as an alias), largest
    holding first, with the coin-wide totals. Data provided by CoinGecko:
    keep the `source` attribution next to any display of these values.
    The upstream list is read at most every 12 hours and never served
    older than 24 hours. `status` is `fresh` within 12 hours, `stale`
    up to 24 hours, and `unavailable` (null totals, no companies) when
    no usable copy exists; an upstream failure still answers 200.
    `tradfiTicker` links a US-listed company to its
    `/api/market/references/{ticker}` reference when one exists.
    Other coins return 404; any query parameter returns 400.

    Args:
        coin (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicCryptoTreasuryResponse | PublicMessageError]
    """

    kwargs = _get_kwargs(
        coin=coin,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    coin: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | PublicCryptoTreasuryResponse | PublicMessageError | None:
    """Public companies holding a coin in treasury

     Keyless list of public companies holding `bitcoin`, `ethereum`,
    `solana` or `binancecoin` (`bnb` is accepted as an alias), largest
    holding first, with the coin-wide totals. Data provided by CoinGecko:
    keep the `source` attribution next to any display of these values.
    The upstream list is read at most every 12 hours and never served
    older than 24 hours. `status` is `fresh` within 12 hours, `stale`
    up to 24 hours, and `unavailable` (null totals, no companies) when
    no usable copy exists; an upstream failure still answers 200.
    `tradfiTicker` links a US-listed company to its
    `/api/market/references/{ticker}` reference when one exists.
    Other coins return 404; any query parameter returns 400.

    Args:
        coin (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicCryptoTreasuryResponse | PublicMessageError
    """

    return (
        await asyncio_detailed(
            coin=coin,
            client=client,
        )
    ).parsed
