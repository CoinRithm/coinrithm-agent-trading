from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.list_public_coins_view import ListPublicCoinsView
from ...models.public_coin_list_response import PublicCoinListResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: int | Unset = 1,
    limit: int | Unset = 50,
    view: ListPublicCoinsView | Unset = ListPublicCoinsView.FULL,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["page"] = page

    params["limit"] = limit

    json_view: str | Unset = UNSET
    if not isinstance(view, Unset):
        json_view = view.value

    params["view"] = json_view

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/coins",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicCoinListResponse | None:
    if response.status_code == 200:
        response_200 = PublicCoinListResponse.from_dict(response.json())

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

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicCoinListResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    limit: int | Unset = 50,
    view: ListPublicCoinsView | Unset = ListPublicCoinsView.FULL,
) -> Response[Error | PublicCoinListResponse]:
    """Tracked coin directory (identity, supply and links; no prices)

     Keyless page of CoinRithm's coin directory, ordered by market-cap rank
    (unranked coins last) and then by `ucid`. Rows carry identity, supply,
    links, categories and chains but NO price: read prices from
    `/api/coins/{slug}`, `/api/coins/{slug}/price` or `/api/live-prices`.
    `ucid` is the `coinId` the agent endpoints take; `slug` keys the
    other public coin reads.

    The directory includes inactive coins (`isActive: false`), and
    `totalRows` counts every coin, active or not (cached for up to 60
    seconds). `view=options` returns only `ucid`, `slug`, `name`,
    `symbol`, `isActive` and `marketCapRank` per row. Unlike the coin
    price reads, supply fields here are JSON numbers; `supplyMax: -1`
    means the supply is uncapped.

    Only `page`, `limit` and `view` are accepted; any other query
    parameter returns 400 `unsupported_query_parameter`. Also served at
    `/api/v1/coins` with identical behaviour.

    Args:
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 50.
        view (ListPublicCoinsView | Unset):  Default: ListPublicCoinsView.FULL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinListResponse]
    """

    kwargs = _get_kwargs(
        page=page,
        limit=limit,
        view=view,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    limit: int | Unset = 50,
    view: ListPublicCoinsView | Unset = ListPublicCoinsView.FULL,
) -> Error | PublicCoinListResponse | None:
    """Tracked coin directory (identity, supply and links; no prices)

     Keyless page of CoinRithm's coin directory, ordered by market-cap rank
    (unranked coins last) and then by `ucid`. Rows carry identity, supply,
    links, categories and chains but NO price: read prices from
    `/api/coins/{slug}`, `/api/coins/{slug}/price` or `/api/live-prices`.
    `ucid` is the `coinId` the agent endpoints take; `slug` keys the
    other public coin reads.

    The directory includes inactive coins (`isActive: false`), and
    `totalRows` counts every coin, active or not (cached for up to 60
    seconds). `view=options` returns only `ucid`, `slug`, `name`,
    `symbol`, `isActive` and `marketCapRank` per row. Unlike the coin
    price reads, supply fields here are JSON numbers; `supplyMax: -1`
    means the supply is uncapped.

    Only `page`, `limit` and `view` are accepted; any other query
    parameter returns 400 `unsupported_query_parameter`. Also served at
    `/api/v1/coins` with identical behaviour.

    Args:
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 50.
        view (ListPublicCoinsView | Unset):  Default: ListPublicCoinsView.FULL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinListResponse
    """

    return sync_detailed(
        client=client,
        page=page,
        limit=limit,
        view=view,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    limit: int | Unset = 50,
    view: ListPublicCoinsView | Unset = ListPublicCoinsView.FULL,
) -> Response[Error | PublicCoinListResponse]:
    """Tracked coin directory (identity, supply and links; no prices)

     Keyless page of CoinRithm's coin directory, ordered by market-cap rank
    (unranked coins last) and then by `ucid`. Rows carry identity, supply,
    links, categories and chains but NO price: read prices from
    `/api/coins/{slug}`, `/api/coins/{slug}/price` or `/api/live-prices`.
    `ucid` is the `coinId` the agent endpoints take; `slug` keys the
    other public coin reads.

    The directory includes inactive coins (`isActive: false`), and
    `totalRows` counts every coin, active or not (cached for up to 60
    seconds). `view=options` returns only `ucid`, `slug`, `name`,
    `symbol`, `isActive` and `marketCapRank` per row. Unlike the coin
    price reads, supply fields here are JSON numbers; `supplyMax: -1`
    means the supply is uncapped.

    Only `page`, `limit` and `view` are accepted; any other query
    parameter returns 400 `unsupported_query_parameter`. Also served at
    `/api/v1/coins` with identical behaviour.

    Args:
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 50.
        view (ListPublicCoinsView | Unset):  Default: ListPublicCoinsView.FULL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicCoinListResponse]
    """

    kwargs = _get_kwargs(
        page=page,
        limit=limit,
        view=view,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    limit: int | Unset = 50,
    view: ListPublicCoinsView | Unset = ListPublicCoinsView.FULL,
) -> Error | PublicCoinListResponse | None:
    """Tracked coin directory (identity, supply and links; no prices)

     Keyless page of CoinRithm's coin directory, ordered by market-cap rank
    (unranked coins last) and then by `ucid`. Rows carry identity, supply,
    links, categories and chains but NO price: read prices from
    `/api/coins/{slug}`, `/api/coins/{slug}/price` or `/api/live-prices`.
    `ucid` is the `coinId` the agent endpoints take; `slug` keys the
    other public coin reads.

    The directory includes inactive coins (`isActive: false`), and
    `totalRows` counts every coin, active or not (cached for up to 60
    seconds). `view=options` returns only `ucid`, `slug`, `name`,
    `symbol`, `isActive` and `marketCapRank` per row. Unlike the coin
    price reads, supply fields here are JSON numbers; `supplyMax: -1`
    means the supply is uncapped.

    Only `page`, `limit` and `view` are accepted; any other query
    parameter returns 400 `unsupported_query_parameter`. Also served at
    `/api/v1/coins` with identical behaviour.

    Args:
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 50.
        view (ListPublicCoinsView | Unset):  Default: ListPublicCoinsView.FULL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicCoinListResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            limit=limit,
            view=view,
        )
    ).parsed
