from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.get_my_trades_response_200 import GetMyTradesResponse200
from ...models.get_my_trades_venue import GetMyTradesVenue
from ...types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime



def _get_kwargs(
    *,
    venue: GetMyTradesVenue | Unset = GetMyTradesVenue.ALL,
    limit: int | Unset = 25,
    updated_since: datetime.datetime | Unset = UNSET,

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    json_venue: str | Unset = UNSET
    if not isinstance(venue, Unset):
        json_venue = venue.value

    params["venue"] = json_venue

    params["limit"] = limit

    json_updated_since: str | Unset = UNSET
    if not isinstance(updated_since, Unset):
        json_updated_since = updated_since.isoformat()
    params["updatedSince"] = json_updated_since


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/trades",
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | GetMyTradesResponse200 | None:
    if response.status_code == 200:
        response_200 = GetMyTradesResponse200.from_dict(response.json())



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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | GetMyTradesResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    venue: GetMyTradesVenue | Unset = GetMyTradesVenue.ALL,
    limit: int | Unset = 25,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Response[Error | GetMyTradesResponse200]:
    """ Unified realized-PnL trade log

     CLOSED trades across all venues (spot fills, closed/liquidated futures,
    settled prediction-markets) merged into one realized-PnL log, most-recent
    first. The agent's memory of what it did and what won/lost. Requires
    scope `read`.

    **Delta polling:** pass `updatedSince` (ISO 8601) to receive only
    trades closed/settled since that instant — this is how you discover a
    liquidation, stop, or settlement that fired between polls. Use the
    response's `asOf` as the next cursor (server-clock based, skew-safe).

    Args:
        venue (GetMyTradesVenue | Unset):  Default: GetMyTradesVenue.ALL.
        limit (int | Unset):  Default: 25.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetMyTradesResponse200]
     """


    kwargs = _get_kwargs(
        venue=venue,
limit=limit,
updated_since=updated_since,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    venue: GetMyTradesVenue | Unset = GetMyTradesVenue.ALL,
    limit: int | Unset = 25,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Error | GetMyTradesResponse200 | None:
    """ Unified realized-PnL trade log

     CLOSED trades across all venues (spot fills, closed/liquidated futures,
    settled prediction-markets) merged into one realized-PnL log, most-recent
    first. The agent's memory of what it did and what won/lost. Requires
    scope `read`.

    **Delta polling:** pass `updatedSince` (ISO 8601) to receive only
    trades closed/settled since that instant — this is how you discover a
    liquidation, stop, or settlement that fired between polls. Use the
    response's `asOf` as the next cursor (server-clock based, skew-safe).

    Args:
        venue (GetMyTradesVenue | Unset):  Default: GetMyTradesVenue.ALL.
        limit (int | Unset):  Default: 25.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetMyTradesResponse200
     """


    return sync_detailed(
        client=client,
venue=venue,
limit=limit,
updated_since=updated_since,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    venue: GetMyTradesVenue | Unset = GetMyTradesVenue.ALL,
    limit: int | Unset = 25,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Response[Error | GetMyTradesResponse200]:
    """ Unified realized-PnL trade log

     CLOSED trades across all venues (spot fills, closed/liquidated futures,
    settled prediction-markets) merged into one realized-PnL log, most-recent
    first. The agent's memory of what it did and what won/lost. Requires
    scope `read`.

    **Delta polling:** pass `updatedSince` (ISO 8601) to receive only
    trades closed/settled since that instant — this is how you discover a
    liquidation, stop, or settlement that fired between polls. Use the
    response's `asOf` as the next cursor (server-clock based, skew-safe).

    Args:
        venue (GetMyTradesVenue | Unset):  Default: GetMyTradesVenue.ALL.
        limit (int | Unset):  Default: 25.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetMyTradesResponse200]
     """


    kwargs = _get_kwargs(
        venue=venue,
limit=limit,
updated_since=updated_since,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    venue: GetMyTradesVenue | Unset = GetMyTradesVenue.ALL,
    limit: int | Unset = 25,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Error | GetMyTradesResponse200 | None:
    """ Unified realized-PnL trade log

     CLOSED trades across all venues (spot fills, closed/liquidated futures,
    settled prediction-markets) merged into one realized-PnL log, most-recent
    first. The agent's memory of what it did and what won/lost. Requires
    scope `read`.

    **Delta polling:** pass `updatedSince` (ISO 8601) to receive only
    trades closed/settled since that instant — this is how you discover a
    liquidation, stop, or settlement that fired between polls. Use the
    response's `asOf` as the next cursor (server-clock based, skew-safe).

    Args:
        venue (GetMyTradesVenue | Unset):  Default: GetMyTradesVenue.ALL.
        limit (int | Unset):  Default: 25.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetMyTradesResponse200
     """


    return (await asyncio_detailed(
        client=client,
venue=venue,
limit=limit,
updated_since=updated_since,

    )).parsed
