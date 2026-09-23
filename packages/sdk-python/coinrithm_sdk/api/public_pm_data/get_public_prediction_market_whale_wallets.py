from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_public_prediction_market_whale_wallets_response_200 import (
    GetPublicPredictionMarketWhaleWalletsResponse200,
)
from ...models.get_public_prediction_market_whale_wallets_source import GetPublicPredictionMarketWhaleWalletsSource
from ...models.get_public_prediction_market_whale_wallets_window import GetPublicPredictionMarketWhaleWalletsWindow
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    window: GetPublicPredictionMarketWhaleWalletsWindow | Unset = GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0,
    source: GetPublicPredictionMarketWhaleWalletsSource | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_window: str | Unset = UNSET
    if not isinstance(window, Unset):
        json_window = window.value

    params["window"] = json_window

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/whales/wallets",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200 | None:
    if response.status_code == 200:
        response_200 = GetPublicPredictionMarketWhaleWalletsResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if response.status_code == 503:
        response_503 = Error.from_dict(response.json())

        return response_503

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
    window: GetPublicPredictionMarketWhaleWalletsWindow | Unset = GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0,
    source: GetPublicPredictionMarketWhaleWalletsSource | Unset = UNSET,
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]:
    """Aggregated large-trader wallet activity

     Observed-window wallet aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Args:
        window (GetPublicPredictionMarketWhaleWalletsWindow | Unset):  Default:
            GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0.
        source (GetPublicPredictionMarketWhaleWalletsSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]
    """

    kwargs = _get_kwargs(
        window=window,
        source=source,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    window: GetPublicPredictionMarketWhaleWalletsWindow | Unset = GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0,
    source: GetPublicPredictionMarketWhaleWalletsSource | Unset = UNSET,
) -> Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200 | None:
    """Aggregated large-trader wallet activity

     Observed-window wallet aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Args:
        window (GetPublicPredictionMarketWhaleWalletsWindow | Unset):  Default:
            GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0.
        source (GetPublicPredictionMarketWhaleWalletsSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200
    """

    return sync_detailed(
        client=client,
        window=window,
        source=source,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    window: GetPublicPredictionMarketWhaleWalletsWindow | Unset = GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0,
    source: GetPublicPredictionMarketWhaleWalletsSource | Unset = UNSET,
) -> Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]:
    """Aggregated large-trader wallet activity

     Observed-window wallet aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Args:
        window (GetPublicPredictionMarketWhaleWalletsWindow | Unset):  Default:
            GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0.
        source (GetPublicPredictionMarketWhaleWalletsSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200]
    """

    kwargs = _get_kwargs(
        window=window,
        source=source,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    window: GetPublicPredictionMarketWhaleWalletsWindow | Unset = GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0,
    source: GetPublicPredictionMarketWhaleWalletsSource | Unset = UNSET,
) -> Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200 | None:
    """Aggregated large-trader wallet activity

     Observed-window wallet aggregation behind the public whales surface. On-chain
    venues only, so absence of a wallet is not evidence of absence of
    trading — it means the venue does not expose one.

    Args:
        window (GetPublicPredictionMarketWhaleWalletsWindow | Unset):  Default:
            GetPublicPredictionMarketWhaleWalletsWindow.VALUE_0.
        source (GetPublicPredictionMarketWhaleWalletsSource | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetPublicPredictionMarketWhaleWalletsResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
            window=window,
            source=source,
        )
    ).parsed
