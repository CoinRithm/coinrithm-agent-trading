from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.open_pm_position_response_422 import OpenPmPositionResponse422
from ...models.pm_open_request import PmOpenRequest
from ...models.pm_position_envelope import PmPositionEnvelope
from ...types import Response


def _get_kwargs(
    *,
    body: PmOpenRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/pm/open",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | OpenPmPositionResponse422 | PmPositionEnvelope | None:
    if response.status_code == 200:
        response_200 = PmPositionEnvelope.from_dict(response.json())

        return response_200

    if response.status_code == 201:
        response_201 = PmPositionEnvelope.from_dict(response.json())

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
        response_422 = OpenPmPositionResponse422.from_dict(response.json())

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
) -> Response[Error | OpenPmPositionResponse422 | PmPositionEnvelope]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmOpenRequest,
) -> Response[Error | OpenPmPositionResponse422 | PmPositionEnvelope]:
    r"""Open a mock prediction-market position

     Requires scope `trade:pm`. Enabled now (server-flag gated — returns 403
    \"PM mock trading is not enabled\" only if later disabled). Binary outcomes
    only; pass `side: \"no\"` to back the NO side (default yes).
    `idempotencyKey` is REQUIRED. `stakeMusd` must be >= 10.

    Args:
        body (PmOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | OpenPmPositionResponse422 | PmPositionEnvelope]
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
    body: PmOpenRequest,
) -> Error | OpenPmPositionResponse422 | PmPositionEnvelope | None:
    r"""Open a mock prediction-market position

     Requires scope `trade:pm`. Enabled now (server-flag gated — returns 403
    \"PM mock trading is not enabled\" only if later disabled). Binary outcomes
    only; pass `side: \"no\"` to back the NO side (default yes).
    `idempotencyKey` is REQUIRED. `stakeMusd` must be >= 10.

    Args:
        body (PmOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | OpenPmPositionResponse422 | PmPositionEnvelope
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmOpenRequest,
) -> Response[Error | OpenPmPositionResponse422 | PmPositionEnvelope]:
    r"""Open a mock prediction-market position

     Requires scope `trade:pm`. Enabled now (server-flag gated — returns 403
    \"PM mock trading is not enabled\" only if later disabled). Binary outcomes
    only; pass `side: \"no\"` to back the NO side (default yes).
    `idempotencyKey` is REQUIRED. `stakeMusd` must be >= 10.

    Args:
        body (PmOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | OpenPmPositionResponse422 | PmPositionEnvelope]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: PmOpenRequest,
) -> Error | OpenPmPositionResponse422 | PmPositionEnvelope | None:
    r"""Open a mock prediction-market position

     Requires scope `trade:pm`. Enabled now (server-flag gated — returns 403
    \"PM mock trading is not enabled\" only if later disabled). Binary outcomes
    only; pass `side: \"no\"` to back the NO side (default yes).
    `idempotencyKey` is REQUIRED. `stakeMusd` must be >= 10.

    Args:
        body (PmOpenRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | OpenPmPositionResponse422 | PmPositionEnvelope
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
