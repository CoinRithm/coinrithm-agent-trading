from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.get_futures_positions_response_200 import GetFuturesPositionsResponse200
from ...types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime



def _get_kwargs(
    *,
    updated_since: datetime.datetime | Unset = UNSET,

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    json_updated_since: str | Unset = UNSET
    if not isinstance(updated_since, Unset):
        json_updated_since = updated_since.isoformat()
    params["updatedSince"] = json_updated_since


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/positions/futures",
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | GetFuturesPositionsResponse200 | None:
    if response.status_code == 200:
        response_200 = GetFuturesPositionsResponse200.from_dict(response.json())



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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | GetFuturesPositionsResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Response[Error | GetFuturesPositionsResponse200]:
    """ Mock futures positions + unrealized PnL + liquidation distance

     Up to 200 positions (open and historical). Supports `updatedSince`
    delta polling — open/close/liquidation all bump a position's row, so
    polling deltas tells you what changed between loops (use the
    response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetFuturesPositionsResponse200]
     """


    kwargs = _get_kwargs(
        updated_since=updated_since,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Error | GetFuturesPositionsResponse200 | None:
    """ Mock futures positions + unrealized PnL + liquidation distance

     Up to 200 positions (open and historical). Supports `updatedSince`
    delta polling — open/close/liquidation all bump a position's row, so
    polling deltas tells you what changed between loops (use the
    response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetFuturesPositionsResponse200
     """


    return sync_detailed(
        client=client,
updated_since=updated_since,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Response[Error | GetFuturesPositionsResponse200]:
    """ Mock futures positions + unrealized PnL + liquidation distance

     Up to 200 positions (open and historical). Supports `updatedSince`
    delta polling — open/close/liquidation all bump a position's row, so
    polling deltas tells you what changed between loops (use the
    response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetFuturesPositionsResponse200]
     """


    kwargs = _get_kwargs(
        updated_since=updated_since,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Error | GetFuturesPositionsResponse200 | None:
    """ Mock futures positions + unrealized PnL + liquidation distance

     Up to 200 positions (open and historical). Supports `updatedSince`
    delta polling — open/close/liquidation all bump a position's row, so
    polling deltas tells you what changed between loops (use the
    response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetFuturesPositionsResponse200
     """


    return (await asyncio_detailed(
        client=client,
updated_since=updated_since,

    )).parsed
