from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_event_holders_response import PublicPmEventHoldersResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import Response


def _get_kwargs(
    source: PublicPmSourceSlug,
    slug: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/events/{source}/{slug}/holders".format(
            source=quote(str(source), safe=""),
            slug=quote(str(slug), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmEventHoldersResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmEventHoldersResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmEventHoldersResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmEventHoldersResponse]:
    """Top holders per outcome of an event (Polymarket)

     Keyless top holders of each outcome, read from Polymarket's public
    holder data on demand and never stored. Top 10 wallets per outcome by
    shares held, with average price (a probability 0-1), current value and
    realized/unrealized P&L in USD as Polymarket reports them. At most 10
    markets per event are covered (live outcomes first, then by
    probability); `marketsCovered < marketsTotal` means a partial list.
    Cached 10 minutes.

    The route takes NO query parameters: any query key answers 400.
    Every other venue answers 200 with `available: false` and a `reason`:
    `venue_has_no_public_holders` (Kalshi), `venue_not_supported`,
    `market_ids_unavailable` (market ids pruned, e.g. some time after
    resolution), or the transient `venue_unavailable` / `busy` (retry
    later). A single outcome whose venue call failed has
    `available: false` while the rest are served.

    `walletPagePath` is the unlocalized path of CoinRithm's whale wallet
    page (`/prediction-markets/whales/polymarket/<wallet>`), set only when
    that page exists; otherwise null.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventHoldersResponse]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmEventHoldersResponse | None:
    """Top holders per outcome of an event (Polymarket)

     Keyless top holders of each outcome, read from Polymarket's public
    holder data on demand and never stored. Top 10 wallets per outcome by
    shares held, with average price (a probability 0-1), current value and
    realized/unrealized P&L in USD as Polymarket reports them. At most 10
    markets per event are covered (live outcomes first, then by
    probability); `marketsCovered < marketsTotal` means a partial list.
    Cached 10 minutes.

    The route takes NO query parameters: any query key answers 400.
    Every other venue answers 200 with `available: false` and a `reason`:
    `venue_has_no_public_holders` (Kalshi), `venue_not_supported`,
    `market_ids_unavailable` (market ids pruned, e.g. some time after
    resolution), or the transient `venue_unavailable` / `busy` (retry
    later). A single outcome whose venue call failed has
    `available: false` while the rest are served.

    `walletPagePath` is the unlocalized path of CoinRithm's whale wallet
    page (`/prediction-markets/whales/polymarket/<wallet>`), set only when
    that page exists; otherwise null.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventHoldersResponse
    """

    return sync_detailed(
        source=source,
        slug=slug,
        client=client,
    ).parsed


async def asyncio_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmEventHoldersResponse]:
    """Top holders per outcome of an event (Polymarket)

     Keyless top holders of each outcome, read from Polymarket's public
    holder data on demand and never stored. Top 10 wallets per outcome by
    shares held, with average price (a probability 0-1), current value and
    realized/unrealized P&L in USD as Polymarket reports them. At most 10
    markets per event are covered (live outcomes first, then by
    probability); `marketsCovered < marketsTotal` means a partial list.
    Cached 10 minutes.

    The route takes NO query parameters: any query key answers 400.
    Every other venue answers 200 with `available: false` and a `reason`:
    `venue_has_no_public_holders` (Kalshi), `venue_not_supported`,
    `market_ids_unavailable` (market ids pruned, e.g. some time after
    resolution), or the transient `venue_unavailable` / `busy` (retry
    later). A single outcome whose venue call failed has
    `available: false` while the rest are served.

    `walletPagePath` is the unlocalized path of CoinRithm's whale wallet
    page (`/prediction-markets/whales/polymarket/<wallet>`), set only when
    that page exists; otherwise null.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventHoldersResponse]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmEventHoldersResponse | None:
    """Top holders per outcome of an event (Polymarket)

     Keyless top holders of each outcome, read from Polymarket's public
    holder data on demand and never stored. Top 10 wallets per outcome by
    shares held, with average price (a probability 0-1), current value and
    realized/unrealized P&L in USD as Polymarket reports them. At most 10
    markets per event are covered (live outcomes first, then by
    probability); `marketsCovered < marketsTotal` means a partial list.
    Cached 10 minutes.

    The route takes NO query parameters: any query key answers 400.
    Every other venue answers 200 with `available: false` and a `reason`:
    `venue_has_no_public_holders` (Kalshi), `venue_not_supported`,
    `market_ids_unavailable` (market ids pruned, e.g. some time after
    resolution), or the transient `venue_unavailable` / `busy` (retry
    later). A single outcome whose venue call failed has
    `available: false` while the rest are served.

    `walletPagePath` is the unlocalized path of CoinRithm's whale wallet
    page (`/prediction-markets/whales/polymarket/<wallet>`), set only when
    that page exists; otherwise null.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventHoldersResponse
    """

    return (
        await asyncio_detailed(
            source=source,
            slug=slug,
            client=client,
        )
    ).parsed
