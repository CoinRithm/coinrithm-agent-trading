from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_public_instrument_markets_horizon import GetPublicInstrumentMarketsHorizon
from ...models.get_public_instrument_markets_type import GetPublicInstrumentMarketsType
from ...models.public_instrument_markets import PublicInstrumentMarkets
from ...models.public_message_error import PublicMessageError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    type_: GetPublicInstrumentMarketsType,
    id: str,
    *,
    horizon: GetPublicInstrumentMarketsHorizon | Unset = GetPublicInstrumentMarketsHorizon.ALL,
    include_short_term: bool | Unset = False,
    limit: int | Unset = 60,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_horizon: str | Unset = UNSET
    if not isinstance(horizon, Unset):
        json_horizon = horizon.value

    params["horizon"] = json_horizon

    params["includeShortTerm"] = include_short_term

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/instruments/{type_}/{id}/markets".format(
            type_=quote(str(type_), safe=""),
            id=quote(str(id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicInstrumentMarkets | PublicMessageError | None:
    if response.status_code == 200:
        response_200 = PublicInstrumentMarkets.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = PublicMessageError.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = PublicMessageError.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | PublicInstrumentMarkets | PublicMessageError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    type_: GetPublicInstrumentMarketsType,
    id: str,
    *,
    client: AuthenticatedClient | Client,
    horizon: GetPublicInstrumentMarketsHorizon | Unset = GetPublicInstrumentMarketsHorizon.ALL,
    include_short_term: bool | Unset = False,
    limit: int | Unset = 60,
) -> Response[Any | PublicInstrumentMarkets | PublicMessageError]:
    """Prediction-market strike ladders on one crypto, TradFi or index instrument

     Keyless join of an instrument to the prediction-market contracts
    written on its price: one group per (expiry, settlement source), one
    ladder per venue series, contracts sorted by comparator then strike.
    Probabilities are venue prices, never CoinRithm forecasts, and each
    ladder names its own settlement source and how it relates to the
    reference price (`referenceRelation`).

    No live price is in the payload. `reference` names the live series to
    read for a current-price marker (`coin_live_price`, `tradfi_reference`
    or `macro_proxy`). `observation` is `at_time` (the price at
    `expiresAt`) or `touch` (the price touches the strike before
    `expiresAt`; `windowStartAt: null` means the venue's own window rules
    apply).

    A known instrument with no contracts returns 200 with `groups: []`;
    `coverage.degraded: true` means the contract read failed. Only
    `horizon`, `includeShortTerm` and `limit` are accepted; any other
    query parameter returns 400. Shared-cached for about 30 seconds within
    the 5-minute prediction-market ingest.

    Args:
        type_ (GetPublicInstrumentMarketsType):
        id (str):
        horizon (GetPublicInstrumentMarketsHorizon | Unset):  Default:
            GetPublicInstrumentMarketsHorizon.ALL.
        include_short_term (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 60.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicInstrumentMarkets | PublicMessageError]
    """

    kwargs = _get_kwargs(
        type_=type_,
        id=id,
        horizon=horizon,
        include_short_term=include_short_term,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    type_: GetPublicInstrumentMarketsType,
    id: str,
    *,
    client: AuthenticatedClient | Client,
    horizon: GetPublicInstrumentMarketsHorizon | Unset = GetPublicInstrumentMarketsHorizon.ALL,
    include_short_term: bool | Unset = False,
    limit: int | Unset = 60,
) -> Any | PublicInstrumentMarkets | PublicMessageError | None:
    """Prediction-market strike ladders on one crypto, TradFi or index instrument

     Keyless join of an instrument to the prediction-market contracts
    written on its price: one group per (expiry, settlement source), one
    ladder per venue series, contracts sorted by comparator then strike.
    Probabilities are venue prices, never CoinRithm forecasts, and each
    ladder names its own settlement source and how it relates to the
    reference price (`referenceRelation`).

    No live price is in the payload. `reference` names the live series to
    read for a current-price marker (`coin_live_price`, `tradfi_reference`
    or `macro_proxy`). `observation` is `at_time` (the price at
    `expiresAt`) or `touch` (the price touches the strike before
    `expiresAt`; `windowStartAt: null` means the venue's own window rules
    apply).

    A known instrument with no contracts returns 200 with `groups: []`;
    `coverage.degraded: true` means the contract read failed. Only
    `horizon`, `includeShortTerm` and `limit` are accepted; any other
    query parameter returns 400. Shared-cached for about 30 seconds within
    the 5-minute prediction-market ingest.

    Args:
        type_ (GetPublicInstrumentMarketsType):
        id (str):
        horizon (GetPublicInstrumentMarketsHorizon | Unset):  Default:
            GetPublicInstrumentMarketsHorizon.ALL.
        include_short_term (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 60.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicInstrumentMarkets | PublicMessageError
    """

    return sync_detailed(
        type_=type_,
        id=id,
        client=client,
        horizon=horizon,
        include_short_term=include_short_term,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    type_: GetPublicInstrumentMarketsType,
    id: str,
    *,
    client: AuthenticatedClient | Client,
    horizon: GetPublicInstrumentMarketsHorizon | Unset = GetPublicInstrumentMarketsHorizon.ALL,
    include_short_term: bool | Unset = False,
    limit: int | Unset = 60,
) -> Response[Any | PublicInstrumentMarkets | PublicMessageError]:
    """Prediction-market strike ladders on one crypto, TradFi or index instrument

     Keyless join of an instrument to the prediction-market contracts
    written on its price: one group per (expiry, settlement source), one
    ladder per venue series, contracts sorted by comparator then strike.
    Probabilities are venue prices, never CoinRithm forecasts, and each
    ladder names its own settlement source and how it relates to the
    reference price (`referenceRelation`).

    No live price is in the payload. `reference` names the live series to
    read for a current-price marker (`coin_live_price`, `tradfi_reference`
    or `macro_proxy`). `observation` is `at_time` (the price at
    `expiresAt`) or `touch` (the price touches the strike before
    `expiresAt`; `windowStartAt: null` means the venue's own window rules
    apply).

    A known instrument with no contracts returns 200 with `groups: []`;
    `coverage.degraded: true` means the contract read failed. Only
    `horizon`, `includeShortTerm` and `limit` are accepted; any other
    query parameter returns 400. Shared-cached for about 30 seconds within
    the 5-minute prediction-market ingest.

    Args:
        type_ (GetPublicInstrumentMarketsType):
        id (str):
        horizon (GetPublicInstrumentMarketsHorizon | Unset):  Default:
            GetPublicInstrumentMarketsHorizon.ALL.
        include_short_term (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 60.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicInstrumentMarkets | PublicMessageError]
    """

    kwargs = _get_kwargs(
        type_=type_,
        id=id,
        horizon=horizon,
        include_short_term=include_short_term,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    type_: GetPublicInstrumentMarketsType,
    id: str,
    *,
    client: AuthenticatedClient | Client,
    horizon: GetPublicInstrumentMarketsHorizon | Unset = GetPublicInstrumentMarketsHorizon.ALL,
    include_short_term: bool | Unset = False,
    limit: int | Unset = 60,
) -> Any | PublicInstrumentMarkets | PublicMessageError | None:
    """Prediction-market strike ladders on one crypto, TradFi or index instrument

     Keyless join of an instrument to the prediction-market contracts
    written on its price: one group per (expiry, settlement source), one
    ladder per venue series, contracts sorted by comparator then strike.
    Probabilities are venue prices, never CoinRithm forecasts, and each
    ladder names its own settlement source and how it relates to the
    reference price (`referenceRelation`).

    No live price is in the payload. `reference` names the live series to
    read for a current-price marker (`coin_live_price`, `tradfi_reference`
    or `macro_proxy`). `observation` is `at_time` (the price at
    `expiresAt`) or `touch` (the price touches the strike before
    `expiresAt`; `windowStartAt: null` means the venue's own window rules
    apply).

    A known instrument with no contracts returns 200 with `groups: []`;
    `coverage.degraded: true` means the contract read failed. Only
    `horizon`, `includeShortTerm` and `limit` are accepted; any other
    query parameter returns 400. Shared-cached for about 30 seconds within
    the 5-minute prediction-market ingest.

    Args:
        type_ (GetPublicInstrumentMarketsType):
        id (str):
        horizon (GetPublicInstrumentMarketsHorizon | Unset):  Default:
            GetPublicInstrumentMarketsHorizon.ALL.
        include_short_term (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 60.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicInstrumentMarkets | PublicMessageError
    """

    return (
        await asyncio_detailed(
            type_=type_,
            id=id,
            client=client,
            horizon=horizon,
            include_short_term=include_short_term,
            limit=limit,
        )
    ).parsed
