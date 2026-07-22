from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.place_spot_order_response_400 import PlaceSpotOrderResponse400
from ...models.place_spot_order_response_404 import PlaceSpotOrderResponse404
from ...models.spot_order_request import SpotOrderRequest
from ...models.spot_order_response import SpotOrderResponse
from typing import cast



def _get_kwargs(
    *,
    body: SpotOrderRequest,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}


    

    

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/spot/order",
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse | None:
    if response.status_code == 200:
        response_200 = SpotOrderResponse.from_dict(response.json())



        return response_200

    if response.status_code == 400:
        response_400 = PlaceSpotOrderResponse400.from_dict(response.json())



        return response_400

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())



        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())



        return response_403

    if response.status_code == 404:
        response_404 = PlaceSpotOrderResponse404.from_dict(response.json())



        return response_404

    if response.status_code == 409:
        response_409 = Error.from_dict(response.json())



        return response_409

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())



        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())



        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: SpotOrderRequest,

) -> Response[Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse]:
    """ Place a spot order (market / limit / stop)

     Paper spot order on your mock wallet. `coinId` is the coin UCID (NOT a
    ticker symbol). `limitPrice` is required for limit/stop; `stopPrice` is
    required for stop. Requires scope `trade:spot`.

    `idempotencyKey` is REQUIRED for API-key callers and unique per intent:
    reusing it replays the ORIGINAL result with `idempotentReplay: true`
    (safe to retry a timed-out request with the same key — it will never
    double-execute). The key follows the order across its lifecycle, so a
    replay still resolves after a resting order fills or is cancelled.

    Args:
        body (SpotOrderRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse]
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
    body: SpotOrderRequest,

) -> Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse | None:
    """ Place a spot order (market / limit / stop)

     Paper spot order on your mock wallet. `coinId` is the coin UCID (NOT a
    ticker symbol). `limitPrice` is required for limit/stop; `stopPrice` is
    required for stop. Requires scope `trade:spot`.

    `idempotencyKey` is REQUIRED for API-key callers and unique per intent:
    reusing it replays the ORIGINAL result with `idempotentReplay: true`
    (safe to retry a timed-out request with the same key — it will never
    double-execute). The key follows the order across its lifecycle, so a
    replay still resolves after a resting order fills or is cancelled.

    Args:
        body (SpotOrderRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse
     """


    return sync_detailed(
        client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: SpotOrderRequest,

) -> Response[Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse]:
    """ Place a spot order (market / limit / stop)

     Paper spot order on your mock wallet. `coinId` is the coin UCID (NOT a
    ticker symbol). `limitPrice` is required for limit/stop; `stopPrice` is
    required for stop. Requires scope `trade:spot`.

    `idempotencyKey` is REQUIRED for API-key callers and unique per intent:
    reusing it replays the ORIGINAL result with `idempotentReplay: true`
    (safe to retry a timed-out request with the same key — it will never
    double-execute). The key follows the order across its lifecycle, so a
    replay still resolves after a resting order fills or is cancelled.

    Args:
        body (SpotOrderRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse]
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
    body: SpotOrderRequest,

) -> Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse | None:
    """ Place a spot order (market / limit / stop)

     Paper spot order on your mock wallet. `coinId` is the coin UCID (NOT a
    ticker symbol). `limitPrice` is required for limit/stop; `stopPrice` is
    required for stop. Requires scope `trade:spot`.

    `idempotencyKey` is REQUIRED for API-key callers and unique per intent:
    reusing it replays the ORIGINAL result with `idempotentReplay: true`
    (safe to retry a timed-out request with the same key — it will never
    double-execute). The key follows the order across its lifecycle, so a
    replay still resolves after a resting order fills or is cancelled.

    Args:
        body (SpotOrderRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PlaceSpotOrderResponse400 | PlaceSpotOrderResponse404 | SpotOrderResponse
     """


    return (await asyncio_detailed(
        client=client,
body=body,

    )).parsed
