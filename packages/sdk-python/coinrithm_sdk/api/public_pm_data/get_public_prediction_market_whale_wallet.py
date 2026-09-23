from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_public_prediction_market_whale_wallet_response_200 import (
    GetPublicPredictionMarketWhaleWalletResponse200,
)
from ...models.get_public_prediction_market_whale_wallet_source import GetPublicPredictionMarketWhaleWalletSource
from ...types import Response


def _get_kwargs(
    source: GetPublicPredictionMarketWhaleWalletSource,
    wallet: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/whales/wallets/{source}/{wallet}".format(
            source=quote(str(source), safe=""),
            wallet=quote(str(wallet), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | Error | GetPublicPredictionMarketWhaleWalletResponse200 | None:
    if response.status_code == 200:
        response_200 = GetPublicPredictionMarketWhaleWalletResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

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
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    source: GetPublicPredictionMarketWhaleWalletSource,
    wallet: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletResponse200]:
    """Public wallet movement detail

     Read-only observed trade-notional summaries, daily activity, top
    events, and recent matched BUY/SELL fills for one identifiable wallet.
    These are public matched-trade observations, not holdings, positions,
    or PnL. Wallet availability is venue-specific.

    Args:
        source (GetPublicPredictionMarketWhaleWalletSource):
        wallet (str): 20-byte EVM wallet address

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetPublicPredictionMarketWhaleWalletResponse200]
    """

    kwargs = _get_kwargs(
        source=source,
        wallet=wallet,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    source: GetPublicPredictionMarketWhaleWalletSource,
    wallet: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | Error | GetPublicPredictionMarketWhaleWalletResponse200 | None:
    """Public wallet movement detail

     Read-only observed trade-notional summaries, daily activity, top
    events, and recent matched BUY/SELL fills for one identifiable wallet.
    These are public matched-trade observations, not holdings, positions,
    or PnL. Wallet availability is venue-specific.

    Args:
        source (GetPublicPredictionMarketWhaleWalletSource):
        wallet (str): 20-byte EVM wallet address

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetPublicPredictionMarketWhaleWalletResponse200
    """

    return sync_detailed(
        source=source,
        wallet=wallet,
        client=client,
    ).parsed


async def asyncio_detailed(
    source: GetPublicPredictionMarketWhaleWalletSource,
    wallet: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletResponse200]:
    """Public wallet movement detail

     Read-only observed trade-notional summaries, daily activity, top
    events, and recent matched BUY/SELL fills for one identifiable wallet.
    These are public matched-trade observations, not holdings, positions,
    or PnL. Wallet availability is venue-specific.

    Args:
        source (GetPublicPredictionMarketWhaleWalletSource):
        wallet (str): 20-byte EVM wallet address

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetPublicPredictionMarketWhaleWalletResponse200]
    """

    kwargs = _get_kwargs(
        source=source,
        wallet=wallet,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    source: GetPublicPredictionMarketWhaleWalletSource,
    wallet: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | Error | GetPublicPredictionMarketWhaleWalletResponse200 | None:
    """Public wallet movement detail

     Read-only observed trade-notional summaries, daily activity, top
    events, and recent matched BUY/SELL fills for one identifiable wallet.
    These are public matched-trade observations, not holdings, positions,
    or PnL. Wallet availability is venue-specific.

    Args:
        source (GetPublicPredictionMarketWhaleWalletSource):
        wallet (str): 20-byte EVM wallet address

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetPublicPredictionMarketWhaleWalletResponse200
    """

    return (
        await asyncio_detailed(
            source=source,
            wallet=wallet,
            client=client,
        )
    ).parsed
