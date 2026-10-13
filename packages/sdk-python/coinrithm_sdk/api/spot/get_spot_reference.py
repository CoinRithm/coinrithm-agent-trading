from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_spot_reference_response_404 import GetSpotReferenceResponse404
from ...models.spot_reference_response import SpotReferenceResponse
from ...types import Response


def _get_kwargs(
    coin_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/spot/reference/{coin_id}".format(
            coin_id=quote(str(coin_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetSpotReferenceResponse404 | SpotReferenceResponse | None:
    if response.status_code == 200:
        response_200 = SpotReferenceResponse.from_dict(response.json())

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
        response_404 = GetSpotReferenceResponse404.from_dict(response.json())

        return response_404

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


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | GetSpotReferenceResponse404 | SpotReferenceResponse]:
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
) -> Response[Error | GetSpotReferenceResponse404 | SpotReferenceResponse]:
    """Dated spot reference price for one coin (Binance stream or stored consensus)

     Reference data only. Returns the Binance spot 24h-ticker last price
    (USDT) for the coin's single verified Binance/USDT mapping when a
    recent stream snapshot exists, plus the stored REST consensus price
    (USD) as an individually dated fallback. Both values keep their own
    units; `preferredSource` is not a USDT/USD conversion, an executable
    price or a paper-fill promise. Spot quotes, orders and market context
    never read this endpoint, so their prices are unchanged by it.

    The stream observation is refused (with `stream.reason`) unless the
    snapshot is connected, at most 10 s old, its universe metadata at
    most 10 min old, and the coin's identity and source policy match.
    `fallback.status` is `fresh` when the stored row was written at most
    120 s ago. Requires scope `read`. Any query parameter returns 400.
    Responses carry `Cache-Control: no-store`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetSpotReferenceResponse404 | SpotReferenceResponse]
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
) -> Error | GetSpotReferenceResponse404 | SpotReferenceResponse | None:
    """Dated spot reference price for one coin (Binance stream or stored consensus)

     Reference data only. Returns the Binance spot 24h-ticker last price
    (USDT) for the coin's single verified Binance/USDT mapping when a
    recent stream snapshot exists, plus the stored REST consensus price
    (USD) as an individually dated fallback. Both values keep their own
    units; `preferredSource` is not a USDT/USD conversion, an executable
    price or a paper-fill promise. Spot quotes, orders and market context
    never read this endpoint, so their prices are unchanged by it.

    The stream observation is refused (with `stream.reason`) unless the
    snapshot is connected, at most 10 s old, its universe metadata at
    most 10 min old, and the coin's identity and source policy match.
    `fallback.status` is `fresh` when the stored row was written at most
    120 s ago. Requires scope `read`. Any query parameter returns 400.
    Responses carry `Cache-Control: no-store`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetSpotReferenceResponse404 | SpotReferenceResponse
    """

    return sync_detailed(
        coin_id=coin_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | GetSpotReferenceResponse404 | SpotReferenceResponse]:
    """Dated spot reference price for one coin (Binance stream or stored consensus)

     Reference data only. Returns the Binance spot 24h-ticker last price
    (USDT) for the coin's single verified Binance/USDT mapping when a
    recent stream snapshot exists, plus the stored REST consensus price
    (USD) as an individually dated fallback. Both values keep their own
    units; `preferredSource` is not a USDT/USD conversion, an executable
    price or a paper-fill promise. Spot quotes, orders and market context
    never read this endpoint, so their prices are unchanged by it.

    The stream observation is refused (with `stream.reason`) unless the
    snapshot is connected, at most 10 s old, its universe metadata at
    most 10 min old, and the coin's identity and source policy match.
    `fallback.status` is `fresh` when the stored row was written at most
    120 s ago. Requires scope `read`. Any query parameter returns 400.
    Responses carry `Cache-Control: no-store`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetSpotReferenceResponse404 | SpotReferenceResponse]
    """

    kwargs = _get_kwargs(
        coin_id=coin_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    coin_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | GetSpotReferenceResponse404 | SpotReferenceResponse | None:
    """Dated spot reference price for one coin (Binance stream or stored consensus)

     Reference data only. Returns the Binance spot 24h-ticker last price
    (USDT) for the coin's single verified Binance/USDT mapping when a
    recent stream snapshot exists, plus the stored REST consensus price
    (USD) as an individually dated fallback. Both values keep their own
    units; `preferredSource` is not a USDT/USD conversion, an executable
    price or a paper-fill promise. Spot quotes, orders and market context
    never read this endpoint, so their prices are unchanged by it.

    The stream observation is refused (with `stream.reason`) unless the
    snapshot is connected, at most 10 s old, its universe metadata at
    most 10 min old, and the coin's identity and source policy match.
    `fallback.status` is `fresh` when the stored row was written at most
    120 s ago. Requires scope `read`. Any query parameter returns 400.
    Responses carry `Cache-Control: no-store`.

    Args:
        coin_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetSpotReferenceResponse404 | SpotReferenceResponse
    """

    return (
        await asyncio_detailed(
            coin_id=coin_id,
            client=client,
        )
    ).parsed
