from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_public_coin_candles_range import GetPublicCoinCandlesRange
from ...models.public_coin_candles import PublicCoinCandles
from ...types import UNSET, Response, Unset


def _get_kwargs(
    slug: str,
    *,
    range_: GetPublicCoinCandlesRange | Unset = GetPublicCoinCandlesRange.VALUE_1,
    fiat: str | Unset = "USD",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_range_: str | Unset = UNSET
    if not isinstance(range_, Unset):
        json_range_ = range_.value

    params["range"] = json_range_

    params["fiat"] = fiat

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/coins/{slug}/candles".format(
            slug=quote(str(slug), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicCoinCandles | None:
    if response.status_code == 200:
        response_200 = PublicCoinCandles.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

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
) -> Response[Error | PublicCoinCandles]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    range_: GetPublicCoinCandlesRange | Unset = GetPublicCoinCandlesRange.VALUE_1,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicCoinCandles]:
    r"""Price bars for one coin, keyed by slug

     Keyless form of `/api/agent/market/{coinId}/candles`, keyed by slug:
    the same loader and payload, without `observation`. `range` fixes
    both lookback and resolution: 1H = 60 x 1-minute, 1D = 288 x
    5-minute, 1W = 672 x 15-minute, 1M = 720 x 1-hour, 3M = 540 x
    4-hour, 1Y = up to 366 daily bars. Bars are oldest first with `t` in
    unix SECONDS. They are sampled composite-price bars, not venue trade
    candles, and `v` is a rolling 24-hour USD quote-volume observation
    at the bar, not the volume traded during it: never sum `v`.

    o/h/l/c are converted to `fiat` at the nearest stored rate. Here
    `fiat` is upper-cased and echoed; `rateToUsd: 1` with a non-USD
    `fiat` means the code is not tracked and the values are USD.

    Query parameters other than `range` and `fiat` are ignored. Unknown
    slug: 404 `{\"error\": \"Coin not found\"}`. Also served at
    `/api/v1/coins/{slug}/candles` with identical behaviour.

    Args:
        slug (str):
        range_ (GetPublicCoinCandlesRange | Unset):  Default: GetPublicCoinCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinCandles]
    """

    kwargs = _get_kwargs(
        slug=slug,
        range_=range_,
        fiat=fiat,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    range_: GetPublicCoinCandlesRange | Unset = GetPublicCoinCandlesRange.VALUE_1,
    fiat: str | Unset = "USD",
) -> Error | PublicCoinCandles | None:
    r"""Price bars for one coin, keyed by slug

     Keyless form of `/api/agent/market/{coinId}/candles`, keyed by slug:
    the same loader and payload, without `observation`. `range` fixes
    both lookback and resolution: 1H = 60 x 1-minute, 1D = 288 x
    5-minute, 1W = 672 x 15-minute, 1M = 720 x 1-hour, 3M = 540 x
    4-hour, 1Y = up to 366 daily bars. Bars are oldest first with `t` in
    unix SECONDS. They are sampled composite-price bars, not venue trade
    candles, and `v` is a rolling 24-hour USD quote-volume observation
    at the bar, not the volume traded during it: never sum `v`.

    o/h/l/c are converted to `fiat` at the nearest stored rate. Here
    `fiat` is upper-cased and echoed; `rateToUsd: 1` with a non-USD
    `fiat` means the code is not tracked and the values are USD.

    Query parameters other than `range` and `fiat` are ignored. Unknown
    slug: 404 `{\"error\": \"Coin not found\"}`. Also served at
    `/api/v1/coins/{slug}/candles` with identical behaviour.

    Args:
        slug (str):
        range_ (GetPublicCoinCandlesRange | Unset):  Default: GetPublicCoinCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinCandles
    """

    return sync_detailed(
        slug=slug,
        client=client,
        range_=range_,
        fiat=fiat,
    ).parsed


async def asyncio_detailed(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    range_: GetPublicCoinCandlesRange | Unset = GetPublicCoinCandlesRange.VALUE_1,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicCoinCandles]:
    r"""Price bars for one coin, keyed by slug

     Keyless form of `/api/agent/market/{coinId}/candles`, keyed by slug:
    the same loader and payload, without `observation`. `range` fixes
    both lookback and resolution: 1H = 60 x 1-minute, 1D = 288 x
    5-minute, 1W = 672 x 15-minute, 1M = 720 x 1-hour, 3M = 540 x
    4-hour, 1Y = up to 366 daily bars. Bars are oldest first with `t` in
    unix SECONDS. They are sampled composite-price bars, not venue trade
    candles, and `v` is a rolling 24-hour USD quote-volume observation
    at the bar, not the volume traded during it: never sum `v`.

    o/h/l/c are converted to `fiat` at the nearest stored rate. Here
    `fiat` is upper-cased and echoed; `rateToUsd: 1` with a non-USD
    `fiat` means the code is not tracked and the values are USD.

    Query parameters other than `range` and `fiat` are ignored. Unknown
    slug: 404 `{\"error\": \"Coin not found\"}`. Also served at
    `/api/v1/coins/{slug}/candles` with identical behaviour.

    Args:
        slug (str):
        range_ (GetPublicCoinCandlesRange | Unset):  Default: GetPublicCoinCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinCandles]
    """

    kwargs = _get_kwargs(
        slug=slug,
        range_=range_,
        fiat=fiat,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    range_: GetPublicCoinCandlesRange | Unset = GetPublicCoinCandlesRange.VALUE_1,
    fiat: str | Unset = "USD",
) -> Error | PublicCoinCandles | None:
    r"""Price bars for one coin, keyed by slug

     Keyless form of `/api/agent/market/{coinId}/candles`, keyed by slug:
    the same loader and payload, without `observation`. `range` fixes
    both lookback and resolution: 1H = 60 x 1-minute, 1D = 288 x
    5-minute, 1W = 672 x 15-minute, 1M = 720 x 1-hour, 3M = 540 x
    4-hour, 1Y = up to 366 daily bars. Bars are oldest first with `t` in
    unix SECONDS. They are sampled composite-price bars, not venue trade
    candles, and `v` is a rolling 24-hour USD quote-volume observation
    at the bar, not the volume traded during it: never sum `v`.

    o/h/l/c are converted to `fiat` at the nearest stored rate. Here
    `fiat` is upper-cased and echoed; `rateToUsd: 1` with a non-USD
    `fiat` means the code is not tracked and the values are USD.

    Query parameters other than `range` and `fiat` are ignored. Unknown
    slug: 404 `{\"error\": \"Coin not found\"}`. Also served at
    `/api/v1/coins/{slug}/candles` with identical behaviour.

    Args:
        slug (str):
        range_ (GetPublicCoinCandlesRange | Unset):  Default: GetPublicCoinCandlesRange.VALUE_1.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinCandles
    """

    return (
        await asyncio_detailed(
            slug=slug,
            client=client,
            range_=range_,
            fiat=fiat,
        )
    ).parsed
