from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.get_candles_range import GetCandlesRange
from ...models.get_candles_response_200 import GetCandlesResponse200
from ...types import UNSET, Unset
from typing import cast



def _get_kwargs(
    coin_id: str,
    *,
    range_: GetCandlesRange | Unset = GetCandlesRange.VALUE_1,
    fiat: str | Unset = 'USD',

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    json_range_: str | Unset = UNSET
    if not isinstance(range_, Unset):
        json_range_ = range_.value

    params["range"] = json_range_

    params["fiat"] = fiat


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/market/{coin_id}/candles".format(coin_id=quote(str(coin_id), safe=""),),
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | Error | GetCandlesResponse200 | None:
    if response.status_code == 200:
        response_200 = GetCandlesResponse200.from_dict(response.json())



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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | Error | GetCandlesResponse200]:
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
    range_: GetCandlesRange | Unset = GetCandlesRange.VALUE_1,
    fiat: str | Unset = 'USD',

) -> Response[Any | Error | GetCandlesResponse200]:
    """ OHLCV candles for one coin

     Historical OHLCV candles for indicator/momentum strategies (RSI,
    moving averages, breakouts), keyed by UCID like the rest of the agent
    surface — call /api/agent/resolve first. `range` picks both the
    lookback and the per-candle resolution: 1H = 60×1-minute,
    1D = 288×5-minute, 1W = 672×15-minute, 1M = 720×1-hour,
    3M = 540×4-hour candles. Candles are oldest→newest with `t` in unix
    SECONDS. o/h/l/c are converted to `fiat` (default USD) at the nearest
    stored rate; `v` (volume) stays USD regardless of fiat. Pure market
    data, cached ~60s server-side. Requires scope `read`.

    Args:
        coin_id (str):
        range_ (GetCandlesRange | Unset):  Default: GetCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetCandlesResponse200]
     """


    kwargs = _get_kwargs(
        coin_id=coin_id,
range_=range_,
fiat=fiat,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,
    range_: GetCandlesRange | Unset = GetCandlesRange.VALUE_1,
    fiat: str | Unset = 'USD',

) -> Any | Error | GetCandlesResponse200 | None:
    """ OHLCV candles for one coin

     Historical OHLCV candles for indicator/momentum strategies (RSI,
    moving averages, breakouts), keyed by UCID like the rest of the agent
    surface — call /api/agent/resolve first. `range` picks both the
    lookback and the per-candle resolution: 1H = 60×1-minute,
    1D = 288×5-minute, 1W = 672×15-minute, 1M = 720×1-hour,
    3M = 540×4-hour candles. Candles are oldest→newest with `t` in unix
    SECONDS. o/h/l/c are converted to `fiat` (default USD) at the nearest
    stored rate; `v` (volume) stays USD regardless of fiat. Pure market
    data, cached ~60s server-side. Requires scope `read`.

    Args:
        coin_id (str):
        range_ (GetCandlesRange | Unset):  Default: GetCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetCandlesResponse200
     """


    return sync_detailed(
        coin_id=coin_id,
client=client,
range_=range_,
fiat=fiat,

    ).parsed

async def asyncio_detailed(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,
    range_: GetCandlesRange | Unset = GetCandlesRange.VALUE_1,
    fiat: str | Unset = 'USD',

) -> Response[Any | Error | GetCandlesResponse200]:
    """ OHLCV candles for one coin

     Historical OHLCV candles for indicator/momentum strategies (RSI,
    moving averages, breakouts), keyed by UCID like the rest of the agent
    surface — call /api/agent/resolve first. `range` picks both the
    lookback and the per-candle resolution: 1H = 60×1-minute,
    1D = 288×5-minute, 1W = 672×15-minute, 1M = 720×1-hour,
    3M = 540×4-hour candles. Candles are oldest→newest with `t` in unix
    SECONDS. o/h/l/c are converted to `fiat` (default USD) at the nearest
    stored rate; `v` (volume) stays USD regardless of fiat. Pure market
    data, cached ~60s server-side. Requires scope `read`.

    Args:
        coin_id (str):
        range_ (GetCandlesRange | Unset):  Default: GetCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetCandlesResponse200]
     """


    kwargs = _get_kwargs(
        coin_id=coin_id,
range_=range_,
fiat=fiat,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,
    range_: GetCandlesRange | Unset = GetCandlesRange.VALUE_1,
    fiat: str | Unset = 'USD',

) -> Any | Error | GetCandlesResponse200 | None:
    """ OHLCV candles for one coin

     Historical OHLCV candles for indicator/momentum strategies (RSI,
    moving averages, breakouts), keyed by UCID like the rest of the agent
    surface — call /api/agent/resolve first. `range` picks both the
    lookback and the per-candle resolution: 1H = 60×1-minute,
    1D = 288×5-minute, 1W = 672×15-minute, 1M = 720×1-hour,
    3M = 540×4-hour candles. Candles are oldest→newest with `t` in unix
    SECONDS. o/h/l/c are converted to `fiat` (default USD) at the nearest
    stored rate; `v` (volume) stays USD regardless of fiat. Pure market
    data, cached ~60s server-side. Requires scope `read`.

    Args:
        coin_id (str):
        range_ (GetCandlesRange | Unset):  Default: GetCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetCandlesResponse200
     """


    return (await asyncio_detailed(
        coin_id=coin_id,
client=client,
range_=range_,
fiat=fiat,

    )).parsed
