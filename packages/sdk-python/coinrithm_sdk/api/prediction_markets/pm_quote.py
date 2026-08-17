from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.pm_quote_request import PmQuoteRequest
from ...models.pm_quote_response import PmQuoteResponse
from ...types import Response


def _get_kwargs(
    *,
    body: PmQuoteRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/pm/quote",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PmQuoteResponse | None:
    if response.status_code == 200:
        response_200 = PmQuoteResponse.from_dict(response.json())

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
) -> Response[Error | PmQuoteResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmQuoteRequest,
) -> Response[Error | PmQuoteResponse]:
    r"""Read-only prediction-market quote (price, eligibility, freshness)

     Never mutates state. Returns entry probability, share estimate, max
    payout, eligibility, and freshness for a binary market outcome. Pass
    `side: \"no\"` to quote backing the NO side (default is yes). Requires
    scope `read`. `stakeMusd` must be > 0 (min to OPEN is 10).

    Args:
        body (PmQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmQuoteResponse]
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
    body: PmQuoteRequest,
) -> Error | PmQuoteResponse | None:
    r"""Read-only prediction-market quote (price, eligibility, freshness)

     Never mutates state. Returns entry probability, share estimate, max
    payout, eligibility, and freshness for a binary market outcome. Pass
    `side: \"no\"` to quote backing the NO side (default is yes). Requires
    scope `read`. `stakeMusd` must be > 0 (min to OPEN is 10).

    Args:
        body (PmQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmQuoteResponse
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmQuoteRequest,
) -> Response[Error | PmQuoteResponse]:
    r"""Read-only prediction-market quote (price, eligibility, freshness)

     Never mutates state. Returns entry probability, share estimate, max
    payout, eligibility, and freshness for a binary market outcome. Pass
    `side: \"no\"` to quote backing the NO side (default is yes). Requires
    scope `read`. `stakeMusd` must be > 0 (min to OPEN is 10).

    Args:
        body (PmQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmQuoteResponse]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: PmQuoteRequest,
) -> Error | PmQuoteResponse | None:
    r"""Read-only prediction-market quote (price, eligibility, freshness)

     Never mutates state. Returns entry probability, share estimate, max
    payout, eligibility, and freshness for a binary market outcome. Pass
    `side: \"no\"` to quote backing the NO side (default is yes). Requires
    scope `read`. `stakeMusd` must be > 0 (min to OPEN is 10).

    Args:
        body (PmQuoteRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmQuoteResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
