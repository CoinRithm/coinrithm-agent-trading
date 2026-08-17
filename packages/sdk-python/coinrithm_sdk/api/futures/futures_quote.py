from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.futures_quote_request import FuturesQuoteRequest
from ...models.futures_quote_response import FuturesQuoteResponse
from ...types import Response


def _get_kwargs(
    *,
    body: FuturesQuoteRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/futures/quote",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | FuturesQuoteResponse | None:
    if response.status_code == 200:
        response_200 = FuturesQuoteResponse.from_dict(response.json())

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


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | FuturesQuoteResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesQuoteRequest,
) -> Response[Error | FuturesQuoteResponse]:
    """Read-only futures quote (price, liq estimate, eligibility)

     Never mutates state. Use it before `futures/open` to see entry price,
    notional, liquidation price, and whether entry is eligible. Requires
    scope `read`. Leverage must be 1..20; margin >= 10 mUSD.

    Args:
        body (FuturesQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesQuoteResponse]
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
    body: FuturesQuoteRequest,
) -> Error | FuturesQuoteResponse | None:
    """Read-only futures quote (price, liq estimate, eligibility)

     Never mutates state. Use it before `futures/open` to see entry price,
    notional, liquidation price, and whether entry is eligible. Requires
    scope `read`. Leverage must be 1..20; margin >= 10 mUSD.

    Args:
        body (FuturesQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesQuoteResponse
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesQuoteRequest,
) -> Response[Error | FuturesQuoteResponse]:
    """Read-only futures quote (price, liq estimate, eligibility)

     Never mutates state. Use it before `futures/open` to see entry price,
    notional, liquidation price, and whether entry is eligible. Requires
    scope `read`. Leverage must be 1..20; margin >= 10 mUSD.

    Args:
        body (FuturesQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesQuoteResponse]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesQuoteRequest,
) -> Error | FuturesQuoteResponse | None:
    """Read-only futures quote (price, liq estimate, eligibility)

     Never mutates state. Use it before `futures/open` to see entry price,
    notional, liquidation price, and whether entry is eligible. Requires
    scope `read`. Leverage must be 1..20; margin >= 10 mUSD.

    Args:
        body (FuturesQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesQuoteResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
