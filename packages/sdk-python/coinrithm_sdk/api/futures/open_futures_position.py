from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.futures_open_request import FuturesOpenRequest
from ...models.futures_position_envelope import FuturesPositionEnvelope
from ...models.open_futures_position_response_422 import OpenFuturesPositionResponse422
from typing import cast



def _get_kwargs(
    *,
    body: FuturesOpenRequest,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}


    

    

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/futures/open",
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422 | None:
    if response.status_code == 200:
        response_200 = FuturesPositionEnvelope.from_dict(response.json())



        return response_200

    if response.status_code == 201:
        response_201 = FuturesPositionEnvelope.from_dict(response.json())



        return response_201

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

    if response.status_code == 409:
        response_409 = Error.from_dict(response.json())



        return response_409

    if response.status_code == 422:
        response_422 = OpenFuturesPositionResponse422.from_dict(response.json())



        return response_422

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())



        return response_429

    if response.status_code == 503:
        response_503 = Error.from_dict(response.json())



        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesOpenRequest,

) -> Response[Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422]:
    """ Open (or add to) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED and unique
    per intent (reuse replays the result). One net position per coin: a
    second open on the same coin/side ADDS to it (same leverage; opposite
    side rejected). Returns 403 only if futures is later disabled.

    Args:
        body (FuturesOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422]
     """


    kwargs = _get_kwargs(
        body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesOpenRequest,

) -> Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422 | None:
    """ Open (or add to) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED and unique
    per intent (reuse replays the result). One net position per coin: a
    second open on the same coin/side ADDS to it (same leverage; opposite
    side rejected). Returns 403 only if futures is later disabled.

    Args:
        body (FuturesOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422
     """


    return sync_detailed(
        client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesOpenRequest,

) -> Response[Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422]:
    """ Open (or add to) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED and unique
    per intent (reuse replays the result). One net position per coin: a
    second open on the same coin/side ADDS to it (same leverage; opposite
    side rejected). Returns 403 only if futures is later disabled.

    Args:
        body (FuturesOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422]
     """


    kwargs = _get_kwargs(
        body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesOpenRequest,

) -> Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422 | None:
    """ Open (or add to) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED and unique
    per intent (reuse replays the result). One net position per coin: a
    second open on the same coin/side ADDS to it (same leverage; opposite
    side rejected). Returns 403 only if futures is later disabled.

    Args:
        body (FuturesOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesPositionEnvelope | OpenFuturesPositionResponse422
     """


    return (await asyncio_detailed(
        client=client,
body=body,

    )).parsed
