from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.list_public_live_prices_sort_by import ListPublicLivePricesSortBy
from ...models.list_public_live_prices_sort_order import ListPublicLivePricesSortOrder
from ...models.public_live_prices_response import PublicLivePricesResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    sort_by: ListPublicLivePricesSortBy | Unset = ListPublicLivePricesSortBy.MARKETCAPUSD,
    sort_order: ListPublicLivePricesSortOrder | Unset = ListPublicLivePricesSortOrder.DESC,
    page: int | Unset = 1,
    limit: int | Unset = 25,
    fiat: str | Unset = "USD",
    include_sparkline: bool | Unset = True,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_sort_by: str | Unset = UNSET
    if not isinstance(sort_by, Unset):
        json_sort_by = sort_by.value

    params["sortBy"] = json_sort_by

    json_sort_order: str | Unset = UNSET
    if not isinstance(sort_order, Unset):
        json_sort_order = sort_order.value

    params["sortOrder"] = json_sort_order

    params["page"] = page

    params["limit"] = limit

    params["fiat"] = fiat

    params["includeSparkline"] = include_sparkline

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/live-prices",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicLivePricesResponse | None:
    if response.status_code == 200:
        response_200 = PublicLivePricesResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if response.status_code == 502:
        response_502 = Error.from_dict(response.json())

        return response_502

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicLivePricesResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    sort_by: ListPublicLivePricesSortBy | Unset = ListPublicLivePricesSortBy.MARKETCAPUSD,
    sort_order: ListPublicLivePricesSortOrder | Unset = ListPublicLivePricesSortOrder.DESC,
    page: int | Unset = 1,
    limit: int | Unset = 25,
    fiat: str | Unset = "USD",
    include_sparkline: bool | Unset = True,
) -> Response[Error | PublicLivePricesResponse]:
    """Live price board for the tracked coin universe

     Keyless paged board of every coin with a live price (about 1,040 on
    2026-10-16), sorted by `sortBy`. Unlike the per-coin reads, numerics
    here are JSON numbers. `currentPrice`, `volume24h`, `marketCapFiat`,
    `high24h`, `low24h` and `sparkline15m` are in `fiat`; changes are
    percentages.

    Each row carries `priceUpdatedAt` (the live-price write time) with
    the derived `priceAgeHours` and `priceStale` (older than
    `priceStaleAfterHours`, 72). Stale rows stay on the board with
    their last known price; `marketCapSuspect` flags a market cap
    CoinRithm does not trust. Despite its name, `sparkline15m` holds
    about 7 days of hourly prices (167 points on 2026-10-16), oldest
    first, or null with `includeSparkline=false` (a much smaller
    payload).

    `fiat` is case-sensitive: an untracked or lower-case code is echoed
    in `fiat` while the values stay USD. Query parameters other than
    the six below are ignored. Also served at `/api/v1/live-prices`
    with identical behaviour.

    Args:
        sort_by (ListPublicLivePricesSortBy | Unset):  Default:
            ListPublicLivePricesSortBy.MARKETCAPUSD.
        sort_order (ListPublicLivePricesSortOrder | Unset):  Default:
            ListPublicLivePricesSortOrder.DESC.
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.
        fiat (str | Unset):  Default: 'USD'.
        include_sparkline (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicLivePricesResponse]
    """

    kwargs = _get_kwargs(
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
        fiat=fiat,
        include_sparkline=include_sparkline,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    sort_by: ListPublicLivePricesSortBy | Unset = ListPublicLivePricesSortBy.MARKETCAPUSD,
    sort_order: ListPublicLivePricesSortOrder | Unset = ListPublicLivePricesSortOrder.DESC,
    page: int | Unset = 1,
    limit: int | Unset = 25,
    fiat: str | Unset = "USD",
    include_sparkline: bool | Unset = True,
) -> Error | PublicLivePricesResponse | None:
    """Live price board for the tracked coin universe

     Keyless paged board of every coin with a live price (about 1,040 on
    2026-10-16), sorted by `sortBy`. Unlike the per-coin reads, numerics
    here are JSON numbers. `currentPrice`, `volume24h`, `marketCapFiat`,
    `high24h`, `low24h` and `sparkline15m` are in `fiat`; changes are
    percentages.

    Each row carries `priceUpdatedAt` (the live-price write time) with
    the derived `priceAgeHours` and `priceStale` (older than
    `priceStaleAfterHours`, 72). Stale rows stay on the board with
    their last known price; `marketCapSuspect` flags a market cap
    CoinRithm does not trust. Despite its name, `sparkline15m` holds
    about 7 days of hourly prices (167 points on 2026-10-16), oldest
    first, or null with `includeSparkline=false` (a much smaller
    payload).

    `fiat` is case-sensitive: an untracked or lower-case code is echoed
    in `fiat` while the values stay USD. Query parameters other than
    the six below are ignored. Also served at `/api/v1/live-prices`
    with identical behaviour.

    Args:
        sort_by (ListPublicLivePricesSortBy | Unset):  Default:
            ListPublicLivePricesSortBy.MARKETCAPUSD.
        sort_order (ListPublicLivePricesSortOrder | Unset):  Default:
            ListPublicLivePricesSortOrder.DESC.
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.
        fiat (str | Unset):  Default: 'USD'.
        include_sparkline (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicLivePricesResponse
    """

    return sync_detailed(
        client=client,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
        fiat=fiat,
        include_sparkline=include_sparkline,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    sort_by: ListPublicLivePricesSortBy | Unset = ListPublicLivePricesSortBy.MARKETCAPUSD,
    sort_order: ListPublicLivePricesSortOrder | Unset = ListPublicLivePricesSortOrder.DESC,
    page: int | Unset = 1,
    limit: int | Unset = 25,
    fiat: str | Unset = "USD",
    include_sparkline: bool | Unset = True,
) -> Response[Error | PublicLivePricesResponse]:
    """Live price board for the tracked coin universe

     Keyless paged board of every coin with a live price (about 1,040 on
    2026-10-16), sorted by `sortBy`. Unlike the per-coin reads, numerics
    here are JSON numbers. `currentPrice`, `volume24h`, `marketCapFiat`,
    `high24h`, `low24h` and `sparkline15m` are in `fiat`; changes are
    percentages.

    Each row carries `priceUpdatedAt` (the live-price write time) with
    the derived `priceAgeHours` and `priceStale` (older than
    `priceStaleAfterHours`, 72). Stale rows stay on the board with
    their last known price; `marketCapSuspect` flags a market cap
    CoinRithm does not trust. Despite its name, `sparkline15m` holds
    about 7 days of hourly prices (167 points on 2026-10-16), oldest
    first, or null with `includeSparkline=false` (a much smaller
    payload).

    `fiat` is case-sensitive: an untracked or lower-case code is echoed
    in `fiat` while the values stay USD. Query parameters other than
    the six below are ignored. Also served at `/api/v1/live-prices`
    with identical behaviour.

    Args:
        sort_by (ListPublicLivePricesSortBy | Unset):  Default:
            ListPublicLivePricesSortBy.MARKETCAPUSD.
        sort_order (ListPublicLivePricesSortOrder | Unset):  Default:
            ListPublicLivePricesSortOrder.DESC.
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.
        fiat (str | Unset):  Default: 'USD'.
        include_sparkline (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicLivePricesResponse]
    """

    kwargs = _get_kwargs(
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
        fiat=fiat,
        include_sparkline=include_sparkline,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    sort_by: ListPublicLivePricesSortBy | Unset = ListPublicLivePricesSortBy.MARKETCAPUSD,
    sort_order: ListPublicLivePricesSortOrder | Unset = ListPublicLivePricesSortOrder.DESC,
    page: int | Unset = 1,
    limit: int | Unset = 25,
    fiat: str | Unset = "USD",
    include_sparkline: bool | Unset = True,
) -> Error | PublicLivePricesResponse | None:
    """Live price board for the tracked coin universe

     Keyless paged board of every coin with a live price (about 1,040 on
    2026-10-16), sorted by `sortBy`. Unlike the per-coin reads, numerics
    here are JSON numbers. `currentPrice`, `volume24h`, `marketCapFiat`,
    `high24h`, `low24h` and `sparkline15m` are in `fiat`; changes are
    percentages.

    Each row carries `priceUpdatedAt` (the live-price write time) with
    the derived `priceAgeHours` and `priceStale` (older than
    `priceStaleAfterHours`, 72). Stale rows stay on the board with
    their last known price; `marketCapSuspect` flags a market cap
    CoinRithm does not trust. Despite its name, `sparkline15m` holds
    about 7 days of hourly prices (167 points on 2026-10-16), oldest
    first, or null with `includeSparkline=false` (a much smaller
    payload).

    `fiat` is case-sensitive: an untracked or lower-case code is echoed
    in `fiat` while the values stay USD. Query parameters other than
    the six below are ignored. Also served at `/api/v1/live-prices`
    with identical behaviour.

    Args:
        sort_by (ListPublicLivePricesSortBy | Unset):  Default:
            ListPublicLivePricesSortBy.MARKETCAPUSD.
        sort_order (ListPublicLivePricesSortOrder | Unset):  Default:
            ListPublicLivePricesSortOrder.DESC.
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.
        fiat (str | Unset):  Default: 'USD'.
        include_sparkline (bool | Unset):  Default: True.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicLivePricesResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            limit=limit,
            fiat=fiat,
            include_sparkline=include_sparkline,
        )
    ).parsed
