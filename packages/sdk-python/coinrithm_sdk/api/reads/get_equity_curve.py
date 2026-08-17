from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_equity_curve_granularity import GetEquityCurveGranularity
from ...models.get_equity_curve_response_200 import GetEquityCurveResponse200
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    days: int | Unset = 30,
    granularity: GetEquityCurveGranularity | Unset = GetEquityCurveGranularity.DAILY,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["days"] = days

    json_granularity: str | Unset = UNSET
    if not isinstance(granularity, Unset):
        json_granularity = granularity.value

    params["granularity"] = json_granularity

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/equity-curve",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetEquityCurveResponse200 | None:
    if response.status_code == 200:
        response_200 = GetEquityCurveResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | GetEquityCurveResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    days: int | Unset = 30,
    granularity: GetEquityCurveGranularity | Unset = GetEquityCurveGranularity.DAILY,
) -> Response[Error | GetEquityCurveResponse200]:
    """Wallet equity time series (daily or intraday realized)

     `granularity=daily` (default): daily equity snapshots
    ({date, usdValue}) — the basis for a PnL chart / performance review.
    `granularity=realized`: an intraday-resolution series with one point
    per realization event (spot sell, futures close/liquidation, PM
    settlement) carrying a cumulative running total — use this for active
    intraday agents where daily snapshots are too coarse (capped at the
    most recent 1000 in-window events). Empty (not 404) when no data
    exists yet. Requires scope `read`.

    Args:
        days (int | Unset):  Default: 30.
        granularity (GetEquityCurveGranularity | Unset):  Default:
            GetEquityCurveGranularity.DAILY.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetEquityCurveResponse200]
    """

    kwargs = _get_kwargs(
        days=days,
        granularity=granularity,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    days: int | Unset = 30,
    granularity: GetEquityCurveGranularity | Unset = GetEquityCurveGranularity.DAILY,
) -> Error | GetEquityCurveResponse200 | None:
    """Wallet equity time series (daily or intraday realized)

     `granularity=daily` (default): daily equity snapshots
    ({date, usdValue}) — the basis for a PnL chart / performance review.
    `granularity=realized`: an intraday-resolution series with one point
    per realization event (spot sell, futures close/liquidation, PM
    settlement) carrying a cumulative running total — use this for active
    intraday agents where daily snapshots are too coarse (capped at the
    most recent 1000 in-window events). Empty (not 404) when no data
    exists yet. Requires scope `read`.

    Args:
        days (int | Unset):  Default: 30.
        granularity (GetEquityCurveGranularity | Unset):  Default:
            GetEquityCurveGranularity.DAILY.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetEquityCurveResponse200
    """

    return sync_detailed(
        client=client,
        days=days,
        granularity=granularity,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    days: int | Unset = 30,
    granularity: GetEquityCurveGranularity | Unset = GetEquityCurveGranularity.DAILY,
) -> Response[Error | GetEquityCurveResponse200]:
    """Wallet equity time series (daily or intraday realized)

     `granularity=daily` (default): daily equity snapshots
    ({date, usdValue}) — the basis for a PnL chart / performance review.
    `granularity=realized`: an intraday-resolution series with one point
    per realization event (spot sell, futures close/liquidation, PM
    settlement) carrying a cumulative running total — use this for active
    intraday agents where daily snapshots are too coarse (capped at the
    most recent 1000 in-window events). Empty (not 404) when no data
    exists yet. Requires scope `read`.

    Args:
        days (int | Unset):  Default: 30.
        granularity (GetEquityCurveGranularity | Unset):  Default:
            GetEquityCurveGranularity.DAILY.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetEquityCurveResponse200]
    """

    kwargs = _get_kwargs(
        days=days,
        granularity=granularity,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    days: int | Unset = 30,
    granularity: GetEquityCurveGranularity | Unset = GetEquityCurveGranularity.DAILY,
) -> Error | GetEquityCurveResponse200 | None:
    """Wallet equity time series (daily or intraday realized)

     `granularity=daily` (default): daily equity snapshots
    ({date, usdValue}) — the basis for a PnL chart / performance review.
    `granularity=realized`: an intraday-resolution series with one point
    per realization event (spot sell, futures close/liquidation, PM
    settlement) carrying a cumulative running total — use this for active
    intraday agents where daily snapshots are too coarse (capped at the
    most recent 1000 in-window events). Empty (not 404) when no data
    exists yet. Requires scope `read`.

    Args:
        days (int | Unset):  Default: 30.
        granularity (GetEquityCurveGranularity | Unset):  Default:
            GetEquityCurveGranularity.DAILY.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetEquityCurveResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
            days=days,
            granularity=granularity,
        )
    ).parsed
