from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.public_message_error import PublicMessageError
from ...models.public_notable_large_trades_response import PublicNotableLargeTradesResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 20,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/large-trades/notable",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicMessageError | PublicNotableLargeTradesResponse | None:
    if response.status_code == 200:
        response_200 = PublicNotableLargeTradesResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = PublicMessageError.from_dict(response.json())

        return response_400

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if response.status_code == 500:
        response_500 = PublicMessageError.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | PublicMessageError | PublicNotableLargeTradesResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
) -> Response[Any | PublicMessageError | PublicNotableLargeTradesResponse]:
    """Notable large trades ranked against each market's own history

     Keyless feed of the few large prints worth attention, judged against
    each market's own trailing distribution instead of one dollar bar.
    A print is notable when it clears the larger of its class floor and
    its venue+symbol p99.9 over the stats window (up to 168 hours); a
    market with fewer than `rules.minSymbolTrades` prints must instead
    clear a multiple of the class floor and 5x its own median.
    Candidates come from the last `rules.candidateHours` hours. Notable
    prints of the same venue, symbol and side at most 60 seconds apart
    form one burst. Newest burst first.

    Hyperliquid bursts carry the largest print's `taker` (same shape as
    GET /api/market/large-trades). Only `limit` is accepted; any other
    query parameter returns 400. Shared-cached for about 60 seconds.

    Args:
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicNotableLargeTradesResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
) -> Any | PublicMessageError | PublicNotableLargeTradesResponse | None:
    """Notable large trades ranked against each market's own history

     Keyless feed of the few large prints worth attention, judged against
    each market's own trailing distribution instead of one dollar bar.
    A print is notable when it clears the larger of its class floor and
    its venue+symbol p99.9 over the stats window (up to 168 hours); a
    market with fewer than `rules.minSymbolTrades` prints must instead
    clear a multiple of the class floor and 5x its own median.
    Candidates come from the last `rules.candidateHours` hours. Notable
    prints of the same venue, symbol and side at most 60 seconds apart
    form one burst. Newest burst first.

    Hyperliquid bursts carry the largest print's `taker` (same shape as
    GET /api/market/large-trades). Only `limit` is accepted; any other
    query parameter returns 400. Shared-cached for about 60 seconds.

    Args:
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicNotableLargeTradesResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
) -> Response[Any | PublicMessageError | PublicNotableLargeTradesResponse]:
    """Notable large trades ranked against each market's own history

     Keyless feed of the few large prints worth attention, judged against
    each market's own trailing distribution instead of one dollar bar.
    A print is notable when it clears the larger of its class floor and
    its venue+symbol p99.9 over the stats window (up to 168 hours); a
    market with fewer than `rules.minSymbolTrades` prints must instead
    clear a multiple of the class floor and 5x its own median.
    Candidates come from the last `rules.candidateHours` hours. Notable
    prints of the same venue, symbol and side at most 60 seconds apart
    form one burst. Newest burst first.

    Hyperliquid bursts carry the largest print's `taker` (same shape as
    GET /api/market/large-trades). Only `limit` is accepted; any other
    query parameter returns 400. Shared-cached for about 60 seconds.

    Args:
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicNotableLargeTradesResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
) -> Any | PublicMessageError | PublicNotableLargeTradesResponse | None:
    """Notable large trades ranked against each market's own history

     Keyless feed of the few large prints worth attention, judged against
    each market's own trailing distribution instead of one dollar bar.
    A print is notable when it clears the larger of its class floor and
    its venue+symbol p99.9 over the stats window (up to 168 hours); a
    market with fewer than `rules.minSymbolTrades` prints must instead
    clear a multiple of the class floor and 5x its own median.
    Candidates come from the last `rules.candidateHours` hours. Notable
    prints of the same venue, symbol and side at most 60 seconds apart
    form one burst. Newest burst first.

    Hyperliquid bursts carry the largest print's `taker` (same shape as
    GET /api/market/large-trades). Only `limit` is accepted; any other
    query parameter returns 400. Shared-cached for about 60 seconds.

    Args:
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicNotableLargeTradesResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
        )
    ).parsed
