from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_public_large_trades_asset_class import GetPublicLargeTradesAssetClass
from ...models.get_public_large_trades_venue import GetPublicLargeTradesVenue
from ...models.public_large_trades_response import PublicLargeTradesResponse
from ...models.public_message_error import PublicMessageError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    symbol: str | Unset = UNSET,
    venue: GetPublicLargeTradesVenue | Unset = UNSET,
    asset_class: GetPublicLargeTradesAssetClass | Unset = UNSET,
    limit: int | Unset = 50,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["symbol"] = symbol

    json_venue: str | Unset = UNSET
    if not isinstance(venue, Unset):
        json_venue = venue.value

    params["venue"] = json_venue

    json_asset_class: str | Unset = UNSET
    if not isinstance(asset_class, Unset):
        json_asset_class = asset_class.value

    params["assetClass"] = json_asset_class

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/large-trades",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicLargeTradesResponse | PublicMessageError | None:
    if response.status_code == 200:
        response_200 = PublicLargeTradesResponse.from_dict(response.json())

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
) -> Response[Any | PublicLargeTradesResponse | PublicMessageError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    symbol: str | Unset = UNSET,
    venue: GetPublicLargeTradesVenue | Unset = UNSET,
    asset_class: GetPublicLargeTradesAssetClass | Unset = UNSET,
    limit: int | Unset = 50,
) -> Response[Any | PublicLargeTradesResponse | PublicMessageError]:
    """Large perpetual-futures trades (whale prints)

     Keyless tape of large perpetual-futures prints on Binance USD-M and
    Hyperliquid, covering crypto perpetuals and the TradFi perpetuals
    those venues list (equities, commodities, FX, indices). Newest first.

    A row is one taker order (Binance: consecutive fills at the same
    trade time) or one transaction (Hyperliquid) at or above a
    per-market USD notional floor. `thresholdUsd` on each row is the
    floor that row had to reach; `side` is the taker side. Notional is
    in the venue's quote stablecoin (USDT/USDC). `assetClass` is a
    best-effort label. Rows exist only while the collector's
    connection is live, so gaps are possible and an empty list is not
    proof that no large trade happened. Hyperliquid rows may carry the
    buyer/seller address and explorer links; Binance publishes no
    per-trade page or address.

    Hyperliquid rows carry `taker`: what the print did for its taker
    wallet (open, add, reduce, close or flip), realized PnL on a reduce,
    close or flip, and the wallet's position in that market when it was
    enriched (`positionNow.asOf`, not the print instant). `taker` is null
    on Binance rows and on a Hyperliquid print that is not enriched yet
    or has no match.

    `symbol` matches an exact venue symbol when it contains `:` (a
    Hyperliquid HIP-3 market such as `xyz:TSLA`) or ends in `USDT`
    (`BTCUSDT`); any other value matches the base across venues (`TSLA`
    returns `TSLAUSDT` and `xyz:TSLA`). Unknown query parameters return
    400. The response is shared-cached for about 15 seconds.

    Args:
        symbol (str | Unset):
        venue (GetPublicLargeTradesVenue | Unset):
        asset_class (GetPublicLargeTradesAssetClass | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicLargeTradesResponse | PublicMessageError]
    """

    kwargs = _get_kwargs(
        symbol=symbol,
        venue=venue,
        asset_class=asset_class,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    symbol: str | Unset = UNSET,
    venue: GetPublicLargeTradesVenue | Unset = UNSET,
    asset_class: GetPublicLargeTradesAssetClass | Unset = UNSET,
    limit: int | Unset = 50,
) -> Any | PublicLargeTradesResponse | PublicMessageError | None:
    """Large perpetual-futures trades (whale prints)

     Keyless tape of large perpetual-futures prints on Binance USD-M and
    Hyperliquid, covering crypto perpetuals and the TradFi perpetuals
    those venues list (equities, commodities, FX, indices). Newest first.

    A row is one taker order (Binance: consecutive fills at the same
    trade time) or one transaction (Hyperliquid) at or above a
    per-market USD notional floor. `thresholdUsd` on each row is the
    floor that row had to reach; `side` is the taker side. Notional is
    in the venue's quote stablecoin (USDT/USDC). `assetClass` is a
    best-effort label. Rows exist only while the collector's
    connection is live, so gaps are possible and an empty list is not
    proof that no large trade happened. Hyperliquid rows may carry the
    buyer/seller address and explorer links; Binance publishes no
    per-trade page or address.

    Hyperliquid rows carry `taker`: what the print did for its taker
    wallet (open, add, reduce, close or flip), realized PnL on a reduce,
    close or flip, and the wallet's position in that market when it was
    enriched (`positionNow.asOf`, not the print instant). `taker` is null
    on Binance rows and on a Hyperliquid print that is not enriched yet
    or has no match.

    `symbol` matches an exact venue symbol when it contains `:` (a
    Hyperliquid HIP-3 market such as `xyz:TSLA`) or ends in `USDT`
    (`BTCUSDT`); any other value matches the base across venues (`TSLA`
    returns `TSLAUSDT` and `xyz:TSLA`). Unknown query parameters return
    400. The response is shared-cached for about 15 seconds.

    Args:
        symbol (str | Unset):
        venue (GetPublicLargeTradesVenue | Unset):
        asset_class (GetPublicLargeTradesAssetClass | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicLargeTradesResponse | PublicMessageError
    """

    return sync_detailed(
        client=client,
        symbol=symbol,
        venue=venue,
        asset_class=asset_class,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    symbol: str | Unset = UNSET,
    venue: GetPublicLargeTradesVenue | Unset = UNSET,
    asset_class: GetPublicLargeTradesAssetClass | Unset = UNSET,
    limit: int | Unset = 50,
) -> Response[Any | PublicLargeTradesResponse | PublicMessageError]:
    """Large perpetual-futures trades (whale prints)

     Keyless tape of large perpetual-futures prints on Binance USD-M and
    Hyperliquid, covering crypto perpetuals and the TradFi perpetuals
    those venues list (equities, commodities, FX, indices). Newest first.

    A row is one taker order (Binance: consecutive fills at the same
    trade time) or one transaction (Hyperliquid) at or above a
    per-market USD notional floor. `thresholdUsd` on each row is the
    floor that row had to reach; `side` is the taker side. Notional is
    in the venue's quote stablecoin (USDT/USDC). `assetClass` is a
    best-effort label. Rows exist only while the collector's
    connection is live, so gaps are possible and an empty list is not
    proof that no large trade happened. Hyperliquid rows may carry the
    buyer/seller address and explorer links; Binance publishes no
    per-trade page or address.

    Hyperliquid rows carry `taker`: what the print did for its taker
    wallet (open, add, reduce, close or flip), realized PnL on a reduce,
    close or flip, and the wallet's position in that market when it was
    enriched (`positionNow.asOf`, not the print instant). `taker` is null
    on Binance rows and on a Hyperliquid print that is not enriched yet
    or has no match.

    `symbol` matches an exact venue symbol when it contains `:` (a
    Hyperliquid HIP-3 market such as `xyz:TSLA`) or ends in `USDT`
    (`BTCUSDT`); any other value matches the base across venues (`TSLA`
    returns `TSLAUSDT` and `xyz:TSLA`). Unknown query parameters return
    400. The response is shared-cached for about 15 seconds.

    Args:
        symbol (str | Unset):
        venue (GetPublicLargeTradesVenue | Unset):
        asset_class (GetPublicLargeTradesAssetClass | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicLargeTradesResponse | PublicMessageError]
    """

    kwargs = _get_kwargs(
        symbol=symbol,
        venue=venue,
        asset_class=asset_class,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    symbol: str | Unset = UNSET,
    venue: GetPublicLargeTradesVenue | Unset = UNSET,
    asset_class: GetPublicLargeTradesAssetClass | Unset = UNSET,
    limit: int | Unset = 50,
) -> Any | PublicLargeTradesResponse | PublicMessageError | None:
    """Large perpetual-futures trades (whale prints)

     Keyless tape of large perpetual-futures prints on Binance USD-M and
    Hyperliquid, covering crypto perpetuals and the TradFi perpetuals
    those venues list (equities, commodities, FX, indices). Newest first.

    A row is one taker order (Binance: consecutive fills at the same
    trade time) or one transaction (Hyperliquid) at or above a
    per-market USD notional floor. `thresholdUsd` on each row is the
    floor that row had to reach; `side` is the taker side. Notional is
    in the venue's quote stablecoin (USDT/USDC). `assetClass` is a
    best-effort label. Rows exist only while the collector's
    connection is live, so gaps are possible and an empty list is not
    proof that no large trade happened. Hyperliquid rows may carry the
    buyer/seller address and explorer links; Binance publishes no
    per-trade page or address.

    Hyperliquid rows carry `taker`: what the print did for its taker
    wallet (open, add, reduce, close or flip), realized PnL on a reduce,
    close or flip, and the wallet's position in that market when it was
    enriched (`positionNow.asOf`, not the print instant). `taker` is null
    on Binance rows and on a Hyperliquid print that is not enriched yet
    or has no match.

    `symbol` matches an exact venue symbol when it contains `:` (a
    Hyperliquid HIP-3 market such as `xyz:TSLA`) or ends in `USDT`
    (`BTCUSDT`); any other value matches the base across venues (`TSLA`
    returns `TSLAUSDT` and `xyz:TSLA`). Unknown query parameters return
    400. The response is shared-cached for about 15 seconds.

    Args:
        symbol (str | Unset):
        venue (GetPublicLargeTradesVenue | Unset):
        asset_class (GetPublicLargeTradesAssetClass | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicLargeTradesResponse | PublicMessageError
    """

    return (
        await asyncio_detailed(
            client=client,
            symbol=symbol,
            venue=venue,
            asset_class=asset_class,
            limit=limit,
        )
    ).parsed
