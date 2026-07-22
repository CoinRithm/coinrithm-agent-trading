from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.get_market_context_response_200 import GetMarketContextResponse200
from typing import cast



def _get_kwargs(
    coin_id: str,

) -> dict[str, Any]:
    

    

    

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/market/{coin_id}".format(coin_id=quote(str(coin_id), safe=""),),
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | Error | GetMarketContextResponse200 | None:
    if response.status_code == 200:
        response_200 = GetMarketContextResponse200.from_dict(response.json())



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
        response_404 = cast(Any, None)
        return response_404

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | Error | GetMarketContextResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | Error | GetMarketContextResponse200]:
    """ Compact factual market context for one coin

     Price + 1h/24h/7d change + market cap, per-coin sentiment, the global
    Fear & Greed value, and up to 3 directly-related OPEN prediction markets
    (leading outcome + probability). All from CoinRithm's own data; no
    generated thesis. Requires scope `read`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetMarketContextResponse200]
     """


    kwargs = _get_kwargs(
        coin_id=coin_id,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Any | Error | GetMarketContextResponse200 | None:
    """ Compact factual market context for one coin

     Price + 1h/24h/7d change + market cap, per-coin sentiment, the global
    Fear & Greed value, and up to 3 directly-related OPEN prediction markets
    (leading outcome + probability). All from CoinRithm's own data; no
    generated thesis. Requires scope `read`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetMarketContextResponse200
     """


    return sync_detailed(
        coin_id=coin_id,
client=client,

    ).parsed

async def asyncio_detailed(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | Error | GetMarketContextResponse200]:
    """ Compact factual market context for one coin

     Price + 1h/24h/7d change + market cap, per-coin sentiment, the global
    Fear & Greed value, and up to 3 directly-related OPEN prediction markets
    (leading outcome + probability). All from CoinRithm's own data; no
    generated thesis. Requires scope `read`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetMarketContextResponse200]
     """


    kwargs = _get_kwargs(
        coin_id=coin_id,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Any | Error | GetMarketContextResponse200 | None:
    """ Compact factual market context for one coin

     Price + 1h/24h/7d change + market cap, per-coin sentiment, the global
    Fear & Greed value, and up to 3 directly-related OPEN prediction markets
    (leading outcome + probability). All from CoinRithm's own data; no
    generated thesis. Requires scope `read`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetMarketContextResponse200
     """


    return (await asyncio_detailed(
        coin_id=coin_id,
client=client,

    )).parsed
