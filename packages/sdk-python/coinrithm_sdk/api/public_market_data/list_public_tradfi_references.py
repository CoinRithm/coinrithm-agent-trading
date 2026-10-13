from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.public_message_error import PublicMessageError
from ...models.public_tradfi_reference_catalog import PublicTradfiReferenceCatalog
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/references",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicMessageError | PublicTradfiReferenceCatalog | None:
    if response.status_code == 200:
        response_200 = PublicTradfiReferenceCatalog.from_dict(response.json())

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
) -> Response[Any | PublicMessageError | PublicTradfiReferenceCatalog]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | PublicMessageError | PublicTradfiReferenceCatalog]:
    """TradFi reference catalog with latest consensus prices

     Keyless catalog of every approved TradFi reference instrument
    (equities, ETFs, metals, commodities and FX) with its latest
    validated consensus, derived 24h/7d change, 24h range, a 7-day
    sparkline and the optional near-real-time `live` overlay.

    A reference price is the median of 2-3 derivatives-venue index
    prices (Binance, Bybit, Gate) that agree within 5%, recorded every
    15 minutes. It is a venue index in the contract's quote asset
    (USDT), not an exchange last trade, and the instrument `unit` is
    deliberately unverified. `latest` and the derived fields come from
    recorded snapshots; `live` republishes the same median about every
    10 seconds and is null when the overlay is off, unavailable,
    invalid, or older than `methodology.liveMaxAgeSeconds`. Freshness
    is collection time, not a venue quote time. Change and range
    values are null when no validated reference snapshot exists for
    the comparison time. Query parameters return 400.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicTradfiReferenceCatalog]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> Any | PublicMessageError | PublicTradfiReferenceCatalog | None:
    """TradFi reference catalog with latest consensus prices

     Keyless catalog of every approved TradFi reference instrument
    (equities, ETFs, metals, commodities and FX) with its latest
    validated consensus, derived 24h/7d change, 24h range, a 7-day
    sparkline and the optional near-real-time `live` overlay.

    A reference price is the median of 2-3 derivatives-venue index
    prices (Binance, Bybit, Gate) that agree within 5%, recorded every
    15 minutes. It is a venue index in the contract's quote asset
    (USDT), not an exchange last trade, and the instrument `unit` is
    deliberately unverified. `latest` and the derived fields come from
    recorded snapshots; `live` republishes the same median about every
    10 seconds and is null when the overlay is off, unavailable,
    invalid, or older than `methodology.liveMaxAgeSeconds`. Freshness
    is collection time, not a venue quote time. Change and range
    values are null when no validated reference snapshot exists for
    the comparison time. Query parameters return 400.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicTradfiReferenceCatalog
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | PublicMessageError | PublicTradfiReferenceCatalog]:
    """TradFi reference catalog with latest consensus prices

     Keyless catalog of every approved TradFi reference instrument
    (equities, ETFs, metals, commodities and FX) with its latest
    validated consensus, derived 24h/7d change, 24h range, a 7-day
    sparkline and the optional near-real-time `live` overlay.

    A reference price is the median of 2-3 derivatives-venue index
    prices (Binance, Bybit, Gate) that agree within 5%, recorded every
    15 minutes. It is a venue index in the contract's quote asset
    (USDT), not an exchange last trade, and the instrument `unit` is
    deliberately unverified. `latest` and the derived fields come from
    recorded snapshots; `live` republishes the same median about every
    10 seconds and is null when the overlay is off, unavailable,
    invalid, or older than `methodology.liveMaxAgeSeconds`. Freshness
    is collection time, not a venue quote time. Change and range
    values are null when no validated reference snapshot exists for
    the comparison time. Query parameters return 400.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicTradfiReferenceCatalog]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> Any | PublicMessageError | PublicTradfiReferenceCatalog | None:
    """TradFi reference catalog with latest consensus prices

     Keyless catalog of every approved TradFi reference instrument
    (equities, ETFs, metals, commodities and FX) with its latest
    validated consensus, derived 24h/7d change, 24h range, a 7-day
    sparkline and the optional near-real-time `live` overlay.

    A reference price is the median of 2-3 derivatives-venue index
    prices (Binance, Bybit, Gate) that agree within 5%, recorded every
    15 minutes. It is a venue index in the contract's quote asset
    (USDT), not an exchange last trade, and the instrument `unit` is
    deliberately unverified. `latest` and the derived fields come from
    recorded snapshots; `live` republishes the same median about every
    10 seconds and is null when the overlay is off, unavailable,
    invalid, or older than `methodology.liveMaxAgeSeconds`. Freshness
    is collection time, not a venue quote time. Change and range
    values are null when no validated reference snapshot exists for
    the comparison time. Query parameters return 400.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicTradfiReferenceCatalog
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
