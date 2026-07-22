from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.list_open_orders_response_200 import ListOpenOrdersResponse200
from ...types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime



def _get_kwargs(
    *,
    coin_id: str | Unset = UNSET,
    limit: int | Unset = 100,
    updated_since: datetime.datetime | Unset = UNSET,

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    params["coinId"] = coin_id

    params["limit"] = limit

    json_updated_since: str | Unset = UNSET
    if not isinstance(updated_since, Unset):
        json_updated_since = updated_since.isoformat()
    params["updatedSince"] = json_updated_since


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/orders/open",
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | ListOpenOrdersResponse200 | None:
    if response.status_code == 200:
        response_200 = ListOpenOrdersResponse200.from_dict(response.json())



        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())



        return response_400

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())



        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())



        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())



        return response_404

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | ListOpenOrdersResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    coin_id: str | Unset = UNSET,
    limit: int | Unset = 100,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Response[Error | ListOpenOrdersResponse200]:
    """ Open spot orders (one coin, or all)

     Open (resting) spot orders. Pass `coinId` to filter to one coin; omit it
    to list ALL open spot orders. Supports `updatedSince` delta polling
    (use the response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        coin_id (str | Unset):
        limit (int | Unset):  Default: 100.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ListOpenOrdersResponse200]
     """


    kwargs = _get_kwargs(
        coin_id=coin_id,
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
    coin_id: str | Unset = UNSET,
    limit: int | Unset = 100,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Error | ListOpenOrdersResponse200 | None:
    """ Open spot orders (one coin, or all)

     Open (resting) spot orders. Pass `coinId` to filter to one coin; omit it
    to list ALL open spot orders. Supports `updatedSince` delta polling
    (use the response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        coin_id (str | Unset):
        limit (int | Unset):  Default: 100.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ListOpenOrdersResponse200
     """


    return sync_detailed(
        client=client,
coin_id=coin_id,
limit=limit,
updated_since=updated_since,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    coin_id: str | Unset = UNSET,
    limit: int | Unset = 100,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Response[Error | ListOpenOrdersResponse200]:
    """ Open spot orders (one coin, or all)

     Open (resting) spot orders. Pass `coinId` to filter to one coin; omit it
    to list ALL open spot orders. Supports `updatedSince` delta polling
    (use the response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        coin_id (str | Unset):
        limit (int | Unset):  Default: 100.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ListOpenOrdersResponse200]
     """


    kwargs = _get_kwargs(
        coin_id=coin_id,
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
    coin_id: str | Unset = UNSET,
    limit: int | Unset = 100,
    updated_since: datetime.datetime | Unset = UNSET,

) -> Error | ListOpenOrdersResponse200 | None:
    """ Open spot orders (one coin, or all)

     Open (resting) spot orders. Pass `coinId` to filter to one coin; omit it
    to list ALL open spot orders. Supports `updatedSince` delta polling
    (use the response's `asOf` as the next cursor). Requires scope `read`.

    Args:
        coin_id (str | Unset):
        limit (int | Unset):  Default: 100.
        updated_since (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ListOpenOrdersResponse200
     """


    return (await asyncio_detailed(
        client=client,
coin_id=coin_id,
limit=limit,
updated_since=updated_since,

    )).parsed
