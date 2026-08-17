from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_public_prediction_market_whale_wallets_response_200 import (
    GetPublicPredictionMarketWhaleWalletsResponse200,
)
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/whales/wallets",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200 | None:
    if response.status_code == 200:
        response_200 = GetPublicPredictionMarketWhaleWalletsResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]:
    """Aggregated large-trader wallet activity

     Wallet-level aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200 | None:
    """Aggregated large-trader wallet activity

     Wallet-level aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]:
    """Aggregated large-trader wallet activity

     Wallet-level aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200 | None:
    """Aggregated large-trader wallet activity

     Wallet-level aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
