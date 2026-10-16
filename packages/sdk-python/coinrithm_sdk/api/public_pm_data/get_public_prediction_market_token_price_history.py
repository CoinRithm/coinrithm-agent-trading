from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_public_prediction_market_token_price_history_interval import (
    GetPublicPredictionMarketTokenPriceHistoryInterval,
)
from ...models.public_pm_prices_history_response import PublicPmPricesHistoryResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...models.retryable_unavailable_error import RetryableUnavailableError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    markets: str | Unset = UNSET,
    market: str | Unset = UNSET,
    token_ids: str | Unset = UNSET,
    source: PublicPmSourceSlug | Unset = UNSET,
    interval: GetPublicPredictionMarketTokenPriceHistoryInterval
    | Unset = GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3,
    series_ticker: str | Unset = UNSET,
    event_id: str | Unset = UNSET,
    fidelity: int | Unset = UNSET,
    start_ts: int | Unset = UNSET,
    end_ts: int | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["markets"] = markets

    params["market"] = market

    params["tokenIds"] = token_ids

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    json_interval: str | Unset = UNSET
    if not isinstance(interval, Unset):
        json_interval = interval.value

    params["interval"] = json_interval

    params["seriesTicker"] = series_ticker

    params["eventId"] = event_id

    params["fidelity"] = fidelity

    params["startTs"] = start_ts

    params["endTs"] = end_ts

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/prices-history",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmPricesHistoryResponse | RetryableUnavailableError | None:
    if response.status_code == 200:
        response_200 = PublicPmPricesHistoryResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if response.status_code == 503:
        response_503 = RetryableUnavailableError.from_dict(response.json())

        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmPricesHistoryResponse | RetryableUnavailableError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    markets: str | Unset = UNSET,
    market: str | Unset = UNSET,
    token_ids: str | Unset = UNSET,
    source: PublicPmSourceSlug | Unset = UNSET,
    interval: GetPublicPredictionMarketTokenPriceHistoryInterval
    | Unset = GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3,
    series_ticker: str | Unset = UNSET,
    event_id: str | Unset = UNSET,
    fidelity: int | Unset = UNSET,
    start_ts: int | Unset = UNSET,
    end_ts: int | Unset = UNSET,
) -> Response[Error | PublicPmPricesHistoryResponse | RetryableUnavailableError]:
    r"""Probability history for up to five venue markets

     Keyless probability history addressed by venue market id rather than
    by event: up to five Polymarket CLOB token ids or Kalshi tickers (an
    outcome's `tokenId`), or stored-history outcomes of the other
    venues. This is the series behind CoinRithm's event charts; for one
    outcome of an event, `/event/{source}/{slug}/price-history` is
    simpler.

    Polymarket and Kalshi series come from the venue. When a venue
    request fails, the series is filled from CoinRithm's stored price
    snapshots instead and labelled: that market carries
    `historySource: \"stored_snapshots\"` and `asOf`, and the response
    carries `freshness: {status: \"lagging\", reason:
    \"upstream_unavailable\", storedMarkets}` and is cached for at most
    30 seconds. Stored snapshots are written when the price changes, so
    they are sparser than the venue series. When every venue request
    fails and nothing is stored, the answer is 503
    `price_history_unavailable` with `Retry-After: 10`. The route also
    has an in-flight cap: 503 `temporarily_busy` with `Retry-After: 5`.
    A 200 with `markets: []` means the venue answered with no points.

    Point times are unix SECONDS for Polymarket and MILLISECONDS for
    Kalshi and the stored-history venues; one response never mixes
    units. Only the parameters below are accepted; any other returns 400
    `unsupported_query_parameter`.

    Args:
        markets (str | Unset):
        market (str | Unset):
        token_ids (str | Unset):
        source (PublicPmSourceSlug | Unset):
        interval (GetPublicPredictionMarketTokenPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3.
        series_ticker (str | Unset):
        event_id (str | Unset):
        fidelity (int | Unset):
        start_ts (int | Unset):
        end_ts (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmPricesHistoryResponse | RetryableUnavailableError]
    """

    kwargs = _get_kwargs(
        markets=markets,
        market=market,
        token_ids=token_ids,
        source=source,
        interval=interval,
        series_ticker=series_ticker,
        event_id=event_id,
        fidelity=fidelity,
        start_ts=start_ts,
        end_ts=end_ts,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    markets: str | Unset = UNSET,
    market: str | Unset = UNSET,
    token_ids: str | Unset = UNSET,
    source: PublicPmSourceSlug | Unset = UNSET,
    interval: GetPublicPredictionMarketTokenPriceHistoryInterval
    | Unset = GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3,
    series_ticker: str | Unset = UNSET,
    event_id: str | Unset = UNSET,
    fidelity: int | Unset = UNSET,
    start_ts: int | Unset = UNSET,
    end_ts: int | Unset = UNSET,
) -> Error | PublicPmPricesHistoryResponse | RetryableUnavailableError | None:
    r"""Probability history for up to five venue markets

     Keyless probability history addressed by venue market id rather than
    by event: up to five Polymarket CLOB token ids or Kalshi tickers (an
    outcome's `tokenId`), or stored-history outcomes of the other
    venues. This is the series behind CoinRithm's event charts; for one
    outcome of an event, `/event/{source}/{slug}/price-history` is
    simpler.

    Polymarket and Kalshi series come from the venue. When a venue
    request fails, the series is filled from CoinRithm's stored price
    snapshots instead and labelled: that market carries
    `historySource: \"stored_snapshots\"` and `asOf`, and the response
    carries `freshness: {status: \"lagging\", reason:
    \"upstream_unavailable\", storedMarkets}` and is cached for at most
    30 seconds. Stored snapshots are written when the price changes, so
    they are sparser than the venue series. When every venue request
    fails and nothing is stored, the answer is 503
    `price_history_unavailable` with `Retry-After: 10`. The route also
    has an in-flight cap: 503 `temporarily_busy` with `Retry-After: 5`.
    A 200 with `markets: []` means the venue answered with no points.

    Point times are unix SECONDS for Polymarket and MILLISECONDS for
    Kalshi and the stored-history venues; one response never mixes
    units. Only the parameters below are accepted; any other returns 400
    `unsupported_query_parameter`.

    Args:
        markets (str | Unset):
        market (str | Unset):
        token_ids (str | Unset):
        source (PublicPmSourceSlug | Unset):
        interval (GetPublicPredictionMarketTokenPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3.
        series_ticker (str | Unset):
        event_id (str | Unset):
        fidelity (int | Unset):
        start_ts (int | Unset):
        end_ts (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmPricesHistoryResponse | RetryableUnavailableError
    """

    return sync_detailed(
        client=client,
        markets=markets,
        market=market,
        token_ids=token_ids,
        source=source,
        interval=interval,
        series_ticker=series_ticker,
        event_id=event_id,
        fidelity=fidelity,
        start_ts=start_ts,
        end_ts=end_ts,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    markets: str | Unset = UNSET,
    market: str | Unset = UNSET,
    token_ids: str | Unset = UNSET,
    source: PublicPmSourceSlug | Unset = UNSET,
    interval: GetPublicPredictionMarketTokenPriceHistoryInterval
    | Unset = GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3,
    series_ticker: str | Unset = UNSET,
    event_id: str | Unset = UNSET,
    fidelity: int | Unset = UNSET,
    start_ts: int | Unset = UNSET,
    end_ts: int | Unset = UNSET,
) -> Response[Error | PublicPmPricesHistoryResponse | RetryableUnavailableError]:
    r"""Probability history for up to five venue markets

     Keyless probability history addressed by venue market id rather than
    by event: up to five Polymarket CLOB token ids or Kalshi tickers (an
    outcome's `tokenId`), or stored-history outcomes of the other
    venues. This is the series behind CoinRithm's event charts; for one
    outcome of an event, `/event/{source}/{slug}/price-history` is
    simpler.

    Polymarket and Kalshi series come from the venue. When a venue
    request fails, the series is filled from CoinRithm's stored price
    snapshots instead and labelled: that market carries
    `historySource: \"stored_snapshots\"` and `asOf`, and the response
    carries `freshness: {status: \"lagging\", reason:
    \"upstream_unavailable\", storedMarkets}` and is cached for at most
    30 seconds. Stored snapshots are written when the price changes, so
    they are sparser than the venue series. When every venue request
    fails and nothing is stored, the answer is 503
    `price_history_unavailable` with `Retry-After: 10`. The route also
    has an in-flight cap: 503 `temporarily_busy` with `Retry-After: 5`.
    A 200 with `markets: []` means the venue answered with no points.

    Point times are unix SECONDS for Polymarket and MILLISECONDS for
    Kalshi and the stored-history venues; one response never mixes
    units. Only the parameters below are accepted; any other returns 400
    `unsupported_query_parameter`.

    Args:
        markets (str | Unset):
        market (str | Unset):
        token_ids (str | Unset):
        source (PublicPmSourceSlug | Unset):
        interval (GetPublicPredictionMarketTokenPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3.
        series_ticker (str | Unset):
        event_id (str | Unset):
        fidelity (int | Unset):
        start_ts (int | Unset):
        end_ts (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmPricesHistoryResponse | RetryableUnavailableError]
    """

    kwargs = _get_kwargs(
        markets=markets,
        market=market,
        token_ids=token_ids,
        source=source,
        interval=interval,
        series_ticker=series_ticker,
        event_id=event_id,
        fidelity=fidelity,
        start_ts=start_ts,
        end_ts=end_ts,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    markets: str | Unset = UNSET,
    market: str | Unset = UNSET,
    token_ids: str | Unset = UNSET,
    source: PublicPmSourceSlug | Unset = UNSET,
    interval: GetPublicPredictionMarketTokenPriceHistoryInterval
    | Unset = GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3,
    series_ticker: str | Unset = UNSET,
    event_id: str | Unset = UNSET,
    fidelity: int | Unset = UNSET,
    start_ts: int | Unset = UNSET,
    end_ts: int | Unset = UNSET,
) -> Error | PublicPmPricesHistoryResponse | RetryableUnavailableError | None:
    r"""Probability history for up to five venue markets

     Keyless probability history addressed by venue market id rather than
    by event: up to five Polymarket CLOB token ids or Kalshi tickers (an
    outcome's `tokenId`), or stored-history outcomes of the other
    venues. This is the series behind CoinRithm's event charts; for one
    outcome of an event, `/event/{source}/{slug}/price-history` is
    simpler.

    Polymarket and Kalshi series come from the venue. When a venue
    request fails, the series is filled from CoinRithm's stored price
    snapshots instead and labelled: that market carries
    `historySource: \"stored_snapshots\"` and `asOf`, and the response
    carries `freshness: {status: \"lagging\", reason:
    \"upstream_unavailable\", storedMarkets}` and is cached for at most
    30 seconds. Stored snapshots are written when the price changes, so
    they are sparser than the venue series. When every venue request
    fails and nothing is stored, the answer is 503
    `price_history_unavailable` with `Retry-After: 10`. The route also
    has an in-flight cap: 503 `temporarily_busy` with `Retry-After: 5`.
    A 200 with `markets: []` means the venue answered with no points.

    Point times are unix SECONDS for Polymarket and MILLISECONDS for
    Kalshi and the stored-history venues; one response never mixes
    units. Only the parameters below are accepted; any other returns 400
    `unsupported_query_parameter`.

    Args:
        markets (str | Unset):
        market (str | Unset):
        token_ids (str | Unset):
        source (PublicPmSourceSlug | Unset):
        interval (GetPublicPredictionMarketTokenPriceHistoryInterval | Unset):  Default:
            GetPublicPredictionMarketTokenPriceHistoryInterval.VALUE_3.
        series_ticker (str | Unset):
        event_id (str | Unset):
        fidelity (int | Unset):
        start_ts (int | Unset):
        end_ts (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmPricesHistoryResponse | RetryableUnavailableError
    """

    return (
        await asyncio_detailed(
            client=client,
            markets=markets,
            market=market,
            token_ids=token_ids,
            source=source,
            interval=interval,
            series_ticker=series_ticker,
            event_id=event_id,
            fidelity=fidelity,
            start_ts=start_ts,
            end_ts=end_ts,
        )
    ).parsed
