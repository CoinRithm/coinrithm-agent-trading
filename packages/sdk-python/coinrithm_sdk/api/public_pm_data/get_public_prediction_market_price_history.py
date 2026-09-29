from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_public_prediction_market_price_history_interval import GetPublicPredictionMarketPriceHistoryInterval
from ...models.get_public_prediction_market_price_history_response_200 import (
    GetPublicPredictionMarketPriceHistoryResponse200,
)
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import UNSET, Response, Unset


def _get_kwargs(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    interval: GetPublicPredictionMarketPriceHistoryInterval
    | Unset = GetPublicPredictionMarketPriceHistoryInterval.VALUE_3,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_interval: str | Unset = UNSET
    if not isinstance(interval, Unset):
        json_interval = interval.value

    params["interval"] = json_interval

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/event/{source}/{slug}/price-history".format(
            source=quote(str(source), safe=""),
            slug=quote(str(slug), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetPublicPredictionMarketPriceHistoryResponse200 | None:
    if response.status_code == 200:
        response_200 = GetPublicPredictionMarketPriceHistoryResponse200.from_dict(response.json())

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
) -> Response[Error | GetPublicPredictionMarketPriceHistoryResponse200]:
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
    interval: GetPublicPredictionMarketPriceHistoryInterval
    | Unset = GetPublicPredictionMarketPriceHistoryInterval.VALUE_3,
) -> Response[Error | GetPublicPredictionMarketPriceHistoryResponse200]:
    r"""Probability history for one outcome of an event

     Native venue price history for ONE outcome of the event: the Yes leg
    of a binary market, else the first outcome in venue order. `outcome`
    names it; on a multi-outcome event, use event detail for the others.

    Polymarket and Kalshi only. Other venues answer 200 with `points: []`,
    which means \"not served here\", not \"no trading\".

    `interval` is a lookback range, not a bucket size. The venue picks
    point spacing (Polymarket 1d: about one point per minute). Depth still
    varies by venue: check `coverage.probabilityHistoryStartDay` on
    /sources before assuming a long window exists.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        interval (GetPublicPredictionMarketPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketPriceHistoryInterval.VALUE_3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetPublicPredictionMarketPriceHistoryResponse200]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
        interval=interval,
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
    interval: GetPublicPredictionMarketPriceHistoryInterval
    | Unset = GetPublicPredictionMarketPriceHistoryInterval.VALUE_3,
) -> Error | GetPublicPredictionMarketPriceHistoryResponse200 | None:
    r"""Probability history for one outcome of an event

     Native venue price history for ONE outcome of the event: the Yes leg
    of a binary market, else the first outcome in venue order. `outcome`
    names it; on a multi-outcome event, use event detail for the others.

    Polymarket and Kalshi only. Other venues answer 200 with `points: []`,
    which means \"not served here\", not \"no trading\".

    `interval` is a lookback range, not a bucket size. The venue picks
    point spacing (Polymarket 1d: about one point per minute). Depth still
    varies by venue: check `coverage.probabilityHistoryStartDay` on
    /sources before assuming a long window exists.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        interval (GetPublicPredictionMarketPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketPriceHistoryInterval.VALUE_3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetPublicPredictionMarketPriceHistoryResponse200
    """

    return sync_detailed(
        source=source,
        slug=slug,
        client=client,
        interval=interval,
    ).parsed


async def asyncio_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    interval: GetPublicPredictionMarketPriceHistoryInterval
    | Unset = GetPublicPredictionMarketPriceHistoryInterval.VALUE_3,
) -> Response[Error | GetPublicPredictionMarketPriceHistoryResponse200]:
    r"""Probability history for one outcome of an event

     Native venue price history for ONE outcome of the event: the Yes leg
    of a binary market, else the first outcome in venue order. `outcome`
    names it; on a multi-outcome event, use event detail for the others.

    Polymarket and Kalshi only. Other venues answer 200 with `points: []`,
    which means \"not served here\", not \"no trading\".

    `interval` is a lookback range, not a bucket size. The venue picks
    point spacing (Polymarket 1d: about one point per minute). Depth still
    varies by venue: check `coverage.probabilityHistoryStartDay` on
    /sources before assuming a long window exists.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        interval (GetPublicPredictionMarketPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketPriceHistoryInterval.VALUE_3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetPublicPredictionMarketPriceHistoryResponse200]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
        interval=interval,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    interval: GetPublicPredictionMarketPriceHistoryInterval
    | Unset = GetPublicPredictionMarketPriceHistoryInterval.VALUE_3,
) -> Error | GetPublicPredictionMarketPriceHistoryResponse200 | None:
    r"""Probability history for one outcome of an event

     Native venue price history for ONE outcome of the event: the Yes leg
    of a binary market, else the first outcome in venue order. `outcome`
    names it; on a multi-outcome event, use event detail for the others.

    Polymarket and Kalshi only. Other venues answer 200 with `points: []`,
    which means \"not served here\", not \"no trading\".

    `interval` is a lookback range, not a bucket size. The venue picks
    point spacing (Polymarket 1d: about one point per minute). Depth still
    varies by venue: check `coverage.probabilityHistoryStartDay` on
    /sources before assuming a long window exists.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        interval (GetPublicPredictionMarketPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketPriceHistoryInterval.VALUE_3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetPublicPredictionMarketPriceHistoryResponse200
    """

    return (
        await asyncio_detailed(
            source=source,
            slug=slug,
            client=client,
            interval=interval,
        )
    ).parsed
