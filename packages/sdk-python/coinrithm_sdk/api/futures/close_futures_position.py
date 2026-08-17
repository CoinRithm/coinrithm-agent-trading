from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.futures_close_request import FuturesCloseRequest
from ...models.futures_position_envelope import FuturesPositionEnvelope
from ...types import Response


def _get_kwargs(
    *,
    body: FuturesCloseRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/futures/close",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | FuturesPositionEnvelope | None:
    if response.status_code == 200:
        response_200 = FuturesPositionEnvelope.from_dict(response.json())

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

    if response.status_code == 409:
        response_409 = Error.from_dict(response.json())

        return response_409

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | FuturesPositionEnvelope]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesCloseRequest,
) -> Response[Error | FuturesPositionEnvelope]:
    """Close (or partially reduce) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED. `fraction`
    in (0,1] reduces partially; omit (or 1) for a full close. If the mark has
    crossed liquidation, the whole position settles as a liquidation
    regardless of `fraction`.

    Args:
        body (FuturesCloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesPositionEnvelope]
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
    body: FuturesCloseRequest,
) -> Error | FuturesPositionEnvelope | None:
    """Close (or partially reduce) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED. `fraction`
    in (0,1] reduces partially; omit (or 1) for a full close. If the mark has
    crossed liquidation, the whole position settles as a liquidation
    regardless of `fraction`.

    Args:
        body (FuturesCloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesPositionEnvelope
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesCloseRequest,
) -> Response[Error | FuturesPositionEnvelope]:
    """Close (or partially reduce) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED. `fraction`
    in (0,1] reduces partially; omit (or 1) for a full close. If the mark has
    crossed liquidation, the whole position settles as a liquidation
    regardless of `fraction`.

    Args:
        body (FuturesCloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesPositionEnvelope]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: FuturesCloseRequest,
) -> Error | FuturesPositionEnvelope | None:
    """Close (or partially reduce) a mock futures position

     Requires scope `trade:futures`. `idempotencyKey` is REQUIRED. `fraction`
    in (0,1] reduces partially; omit (or 1) for a full close. If the mark has
    crossed liquidation, the whole position settles as a liquidation
    regardless of `fraction`.

    Args:
        body (FuturesCloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesPositionEnvelope
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
