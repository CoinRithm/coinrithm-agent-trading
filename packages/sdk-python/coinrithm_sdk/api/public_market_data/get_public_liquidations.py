from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_public_liquidations_venue import GetPublicLiquidationsVenue
from ...models.public_liquidations_response import PublicLiquidationsResponse
from ...models.public_message_error import PublicMessageError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    base: str,
    limit: int | Unset = 10,
    venue: GetPublicLiquidationsVenue | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["base"] = base

    params["limit"] = limit

    json_venue: str | Unset = UNSET
    if not isinstance(venue, Unset):
        json_venue = venue.value

    params["venue"] = json_venue

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/liquidations",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicLiquidationsResponse | PublicMessageError | None:
    if response.status_code == 200:
        response_200 = PublicLiquidationsResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = PublicMessageError.from_dict(response.json())

        return response_400

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if response.status_code == 500:
        response_500 = PublicMessageError.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | PublicLiquidationsResponse | PublicMessageError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    base: str,
    limit: int | Unset = 10,
    venue: GetPublicLiquidationsVenue | Unset = UNSET,
) -> Response[Any | PublicLiquidationsResponse | PublicMessageError]:
    r"""Last-24h liquidations for one base symbol

     Keyless 24-hour liquidation summary for one base symbol (a coin such
    as `BTC`, or a TradFi perpetual base such as `XAU` or `NVDA`) across
    the Binance USD-M forced-order stream and the OKX liquidation-orders
    channel: long/short totals, per-venue totals, and the biggest and
    latest events.

    Sums cover only what CoinRithm's capture saw while running.
    `capturedPct` is a lower bound of capture uptime for the window, not
    exchange completeness, and is null when no capture was recorded (a
    gap, never \"no liquidations\"). Binance publishes at most the latest
    liquidation per symbol per second. `long` means a long position was
    liquidated (a forced sell). The base is the venue's own base symbol,
    so two assets that share a ticker share a row set; for a stock ticker
    pass `venue=okx`, because Binance's feed carries crypto contracts
    only. `truncated` is true when the row cap was reached and totals are
    then a lower bound. An unknown base returns 200 with zero totals.
    The response is shared-cached for about 60 seconds.

    Args:
        base (str):
        limit (int | Unset):  Default: 10.
        venue (GetPublicLiquidationsVenue | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicLiquidationsResponse | PublicMessageError]
    """

    kwargs = _get_kwargs(
        base=base,
        limit=limit,
        venue=venue,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    base: str,
    limit: int | Unset = 10,
    venue: GetPublicLiquidationsVenue | Unset = UNSET,
) -> Any | PublicLiquidationsResponse | PublicMessageError | None:
    r"""Last-24h liquidations for one base symbol

     Keyless 24-hour liquidation summary for one base symbol (a coin such
    as `BTC`, or a TradFi perpetual base such as `XAU` or `NVDA`) across
    the Binance USD-M forced-order stream and the OKX liquidation-orders
    channel: long/short totals, per-venue totals, and the biggest and
    latest events.

    Sums cover only what CoinRithm's capture saw while running.
    `capturedPct` is a lower bound of capture uptime for the window, not
    exchange completeness, and is null when no capture was recorded (a
    gap, never \"no liquidations\"). Binance publishes at most the latest
    liquidation per symbol per second. `long` means a long position was
    liquidated (a forced sell). The base is the venue's own base symbol,
    so two assets that share a ticker share a row set; for a stock ticker
    pass `venue=okx`, because Binance's feed carries crypto contracts
    only. `truncated` is true when the row cap was reached and totals are
    then a lower bound. An unknown base returns 200 with zero totals.
    The response is shared-cached for about 60 seconds.

    Args:
        base (str):
        limit (int | Unset):  Default: 10.
        venue (GetPublicLiquidationsVenue | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicLiquidationsResponse | PublicMessageError
    """

    return sync_detailed(
        client=client,
        base=base,
        limit=limit,
        venue=venue,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    base: str,
    limit: int | Unset = 10,
    venue: GetPublicLiquidationsVenue | Unset = UNSET,
) -> Response[Any | PublicLiquidationsResponse | PublicMessageError]:
    r"""Last-24h liquidations for one base symbol

     Keyless 24-hour liquidation summary for one base symbol (a coin such
    as `BTC`, or a TradFi perpetual base such as `XAU` or `NVDA`) across
    the Binance USD-M forced-order stream and the OKX liquidation-orders
    channel: long/short totals, per-venue totals, and the biggest and
    latest events.

    Sums cover only what CoinRithm's capture saw while running.
    `capturedPct` is a lower bound of capture uptime for the window, not
    exchange completeness, and is null when no capture was recorded (a
    gap, never \"no liquidations\"). Binance publishes at most the latest
    liquidation per symbol per second. `long` means a long position was
    liquidated (a forced sell). The base is the venue's own base symbol,
    so two assets that share a ticker share a row set; for a stock ticker
    pass `venue=okx`, because Binance's feed carries crypto contracts
    only. `truncated` is true when the row cap was reached and totals are
    then a lower bound. An unknown base returns 200 with zero totals.
    The response is shared-cached for about 60 seconds.

    Args:
        base (str):
        limit (int | Unset):  Default: 10.
        venue (GetPublicLiquidationsVenue | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicLiquidationsResponse | PublicMessageError]
    """

    kwargs = _get_kwargs(
        base=base,
        limit=limit,
        venue=venue,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    base: str,
    limit: int | Unset = 10,
    venue: GetPublicLiquidationsVenue | Unset = UNSET,
) -> Any | PublicLiquidationsResponse | PublicMessageError | None:
    r"""Last-24h liquidations for one base symbol

     Keyless 24-hour liquidation summary for one base symbol (a coin such
    as `BTC`, or a TradFi perpetual base such as `XAU` or `NVDA`) across
    the Binance USD-M forced-order stream and the OKX liquidation-orders
    channel: long/short totals, per-venue totals, and the biggest and
    latest events.

    Sums cover only what CoinRithm's capture saw while running.
    `capturedPct` is a lower bound of capture uptime for the window, not
    exchange completeness, and is null when no capture was recorded (a
    gap, never \"no liquidations\"). Binance publishes at most the latest
    liquidation per symbol per second. `long` means a long position was
    liquidated (a forced sell). The base is the venue's own base symbol,
    so two assets that share a ticker share a row set; for a stock ticker
    pass `venue=okx`, because Binance's feed carries crypto contracts
    only. `truncated` is true when the row cap was reached and totals are
    then a lower bound. An unknown base returns 200 with zero totals.
    The response is shared-cached for about 60 seconds.

    Args:
        base (str):
        limit (int | Unset):  Default: 10.
        venue (GetPublicLiquidationsVenue | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicLiquidationsResponse | PublicMessageError
    """

    return (
        await asyncio_detailed(
            client=client,
            base=base,
            limit=limit,
            venue=venue,
        )
    ).parsed
