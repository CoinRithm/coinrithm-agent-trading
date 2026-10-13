from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.agent_universe_response import AgentUniverseResponse
from ...models.agent_universe_validation_error import AgentUniverseValidationError
from ...models.error import Error
from ...models.get_agent_universe_exclude_stablecoins import GetAgentUniverseExcludeStablecoins
from ...models.get_agent_universe_sort import GetAgentUniverseSort
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    rank_min: int | Unset = 1,
    rank_max: int | Unset = 100,
    min_volume_24_h_usd: float | Unset = 0.0,
    exclude_stablecoins: GetAgentUniverseExcludeStablecoins | Unset = GetAgentUniverseExcludeStablecoins.FALSE,
    include_sectors: str | Unset = UNSET,
    exclude_sectors: str | Unset = UNSET,
    sort: GetAgentUniverseSort | Unset = GetAgentUniverseSort.ABS_CHANGE_24H,
    ucids: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["rankMin"] = rank_min

    params["rankMax"] = rank_max

    params["minVolume24hUsd"] = min_volume_24_h_usd

    json_exclude_stablecoins: str | Unset = UNSET
    if not isinstance(exclude_stablecoins, Unset):
        json_exclude_stablecoins = exclude_stablecoins.value

    params["excludeStablecoins"] = json_exclude_stablecoins

    params["includeSectors"] = include_sectors

    params["excludeSectors"] = exclude_sectors

    json_sort: str | Unset = UNSET
    if not isinstance(sort, Unset):
        json_sort = sort.value

    params["sort"] = json_sort

    params["ucids"] = ucids

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/universe",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AgentUniverseResponse | AgentUniverseValidationError | Error | None:
    if response.status_code == 200:
        response_200 = AgentUniverseResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = AgentUniverseValidationError.from_dict(response.json())

        return response_400

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

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
) -> Response[AgentUniverseResponse | AgentUniverseValidationError | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    rank_min: int | Unset = 1,
    rank_max: int | Unset = 100,
    min_volume_24_h_usd: float | Unset = 0.0,
    exclude_stablecoins: GetAgentUniverseExcludeStablecoins | Unset = GetAgentUniverseExcludeStablecoins.FALSE,
    include_sectors: str | Unset = UNSET,
    exclude_sectors: str | Unset = UNSET,
    sort: GetAgentUniverseSort | Unset = GetAgentUniverseSort.ABS_CHANGE_24H,
    ucids: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> Response[AgentUniverseResponse | AgentUniverseValidationError | Error]:
    """Screen coins inside market boundaries (rank band, volume, sectors)

     Returns up to `limit` active coins inside the caller's boundaries:
    market-cap rank band, minimum 24h USD volume, optional stablecoin
    exclusion and curated sectors in/out (ids from
    /api/agent/universe/sectors). Coins flagged market-cap-suspect and
    coins whose live price is older than 72 h are never included. Sorts
    that need a change or volume value exclude coins where it is null.
    Ties break on market-cap rank, then UCID, so equal data gives equal
    order. A sector both included and excluded is excluded.

    Pass `ucids` to check whether specific coins are inside the same
    boundaries (membership check, at most 50 ids). Unknown query
    parameters are ignored. Pure market data on a shared 60 s URL-keyed
    cache, so `priceAgeHours` can lag the response time by up to a
    minute. Requires scope `read`.

    Args:
        rank_min (int | Unset):  Default: 1.
        rank_max (int | Unset):  Default: 100.
        min_volume_24_h_usd (float | Unset):  Default: 0.0.
        exclude_stablecoins (GetAgentUniverseExcludeStablecoins | Unset):  Default:
            GetAgentUniverseExcludeStablecoins.FALSE.
        include_sectors (str | Unset):
        exclude_sectors (str | Unset):
        sort (GetAgentUniverseSort | Unset):  Default: GetAgentUniverseSort.ABS_CHANGE_24H.
        ucids (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentUniverseResponse | AgentUniverseValidationError | Error]
    """

    kwargs = _get_kwargs(
        rank_min=rank_min,
        rank_max=rank_max,
        min_volume_24_h_usd=min_volume_24_h_usd,
        exclude_stablecoins=exclude_stablecoins,
        include_sectors=include_sectors,
        exclude_sectors=exclude_sectors,
        sort=sort,
        ucids=ucids,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    rank_min: int | Unset = 1,
    rank_max: int | Unset = 100,
    min_volume_24_h_usd: float | Unset = 0.0,
    exclude_stablecoins: GetAgentUniverseExcludeStablecoins | Unset = GetAgentUniverseExcludeStablecoins.FALSE,
    include_sectors: str | Unset = UNSET,
    exclude_sectors: str | Unset = UNSET,
    sort: GetAgentUniverseSort | Unset = GetAgentUniverseSort.ABS_CHANGE_24H,
    ucids: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> AgentUniverseResponse | AgentUniverseValidationError | Error | None:
    """Screen coins inside market boundaries (rank band, volume, sectors)

     Returns up to `limit` active coins inside the caller's boundaries:
    market-cap rank band, minimum 24h USD volume, optional stablecoin
    exclusion and curated sectors in/out (ids from
    /api/agent/universe/sectors). Coins flagged market-cap-suspect and
    coins whose live price is older than 72 h are never included. Sorts
    that need a change or volume value exclude coins where it is null.
    Ties break on market-cap rank, then UCID, so equal data gives equal
    order. A sector both included and excluded is excluded.

    Pass `ucids` to check whether specific coins are inside the same
    boundaries (membership check, at most 50 ids). Unknown query
    parameters are ignored. Pure market data on a shared 60 s URL-keyed
    cache, so `priceAgeHours` can lag the response time by up to a
    minute. Requires scope `read`.

    Args:
        rank_min (int | Unset):  Default: 1.
        rank_max (int | Unset):  Default: 100.
        min_volume_24_h_usd (float | Unset):  Default: 0.0.
        exclude_stablecoins (GetAgentUniverseExcludeStablecoins | Unset):  Default:
            GetAgentUniverseExcludeStablecoins.FALSE.
        include_sectors (str | Unset):
        exclude_sectors (str | Unset):
        sort (GetAgentUniverseSort | Unset):  Default: GetAgentUniverseSort.ABS_CHANGE_24H.
        ucids (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentUniverseResponse | AgentUniverseValidationError | Error
    """

    return sync_detailed(
        client=client,
        rank_min=rank_min,
        rank_max=rank_max,
        min_volume_24_h_usd=min_volume_24_h_usd,
        exclude_stablecoins=exclude_stablecoins,
        include_sectors=include_sectors,
        exclude_sectors=exclude_sectors,
        sort=sort,
        ucids=ucids,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    rank_min: int | Unset = 1,
    rank_max: int | Unset = 100,
    min_volume_24_h_usd: float | Unset = 0.0,
    exclude_stablecoins: GetAgentUniverseExcludeStablecoins | Unset = GetAgentUniverseExcludeStablecoins.FALSE,
    include_sectors: str | Unset = UNSET,
    exclude_sectors: str | Unset = UNSET,
    sort: GetAgentUniverseSort | Unset = GetAgentUniverseSort.ABS_CHANGE_24H,
    ucids: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> Response[AgentUniverseResponse | AgentUniverseValidationError | Error]:
    """Screen coins inside market boundaries (rank band, volume, sectors)

     Returns up to `limit` active coins inside the caller's boundaries:
    market-cap rank band, minimum 24h USD volume, optional stablecoin
    exclusion and curated sectors in/out (ids from
    /api/agent/universe/sectors). Coins flagged market-cap-suspect and
    coins whose live price is older than 72 h are never included. Sorts
    that need a change or volume value exclude coins where it is null.
    Ties break on market-cap rank, then UCID, so equal data gives equal
    order. A sector both included and excluded is excluded.

    Pass `ucids` to check whether specific coins are inside the same
    boundaries (membership check, at most 50 ids). Unknown query
    parameters are ignored. Pure market data on a shared 60 s URL-keyed
    cache, so `priceAgeHours` can lag the response time by up to a
    minute. Requires scope `read`.

    Args:
        rank_min (int | Unset):  Default: 1.
        rank_max (int | Unset):  Default: 100.
        min_volume_24_h_usd (float | Unset):  Default: 0.0.
        exclude_stablecoins (GetAgentUniverseExcludeStablecoins | Unset):  Default:
            GetAgentUniverseExcludeStablecoins.FALSE.
        include_sectors (str | Unset):
        exclude_sectors (str | Unset):
        sort (GetAgentUniverseSort | Unset):  Default: GetAgentUniverseSort.ABS_CHANGE_24H.
        ucids (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentUniverseResponse | AgentUniverseValidationError | Error]
    """

    kwargs = _get_kwargs(
        rank_min=rank_min,
        rank_max=rank_max,
        min_volume_24_h_usd=min_volume_24_h_usd,
        exclude_stablecoins=exclude_stablecoins,
        include_sectors=include_sectors,
        exclude_sectors=exclude_sectors,
        sort=sort,
        ucids=ucids,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    rank_min: int | Unset = 1,
    rank_max: int | Unset = 100,
    min_volume_24_h_usd: float | Unset = 0.0,
    exclude_stablecoins: GetAgentUniverseExcludeStablecoins | Unset = GetAgentUniverseExcludeStablecoins.FALSE,
    include_sectors: str | Unset = UNSET,
    exclude_sectors: str | Unset = UNSET,
    sort: GetAgentUniverseSort | Unset = GetAgentUniverseSort.ABS_CHANGE_24H,
    ucids: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> AgentUniverseResponse | AgentUniverseValidationError | Error | None:
    """Screen coins inside market boundaries (rank band, volume, sectors)

     Returns up to `limit` active coins inside the caller's boundaries:
    market-cap rank band, minimum 24h USD volume, optional stablecoin
    exclusion and curated sectors in/out (ids from
    /api/agent/universe/sectors). Coins flagged market-cap-suspect and
    coins whose live price is older than 72 h are never included. Sorts
    that need a change or volume value exclude coins where it is null.
    Ties break on market-cap rank, then UCID, so equal data gives equal
    order. A sector both included and excluded is excluded.

    Pass `ucids` to check whether specific coins are inside the same
    boundaries (membership check, at most 50 ids). Unknown query
    parameters are ignored. Pure market data on a shared 60 s URL-keyed
    cache, so `priceAgeHours` can lag the response time by up to a
    minute. Requires scope `read`.

    Args:
        rank_min (int | Unset):  Default: 1.
        rank_max (int | Unset):  Default: 100.
        min_volume_24_h_usd (float | Unset):  Default: 0.0.
        exclude_stablecoins (GetAgentUniverseExcludeStablecoins | Unset):  Default:
            GetAgentUniverseExcludeStablecoins.FALSE.
        include_sectors (str | Unset):
        exclude_sectors (str | Unset):
        sort (GetAgentUniverseSort | Unset):  Default: GetAgentUniverseSort.ABS_CHANGE_24H.
        ucids (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentUniverseResponse | AgentUniverseValidationError | Error
    """

    return (
        await asyncio_detailed(
            client=client,
            rank_min=rank_min,
            rank_max=rank_max,
            min_volume_24_h_usd=min_volume_24_h_usd,
            exclude_stablecoins=exclude_stablecoins,
            include_sectors=include_sectors,
            exclude_sectors=exclude_sectors,
            sort=sort,
            ucids=ucids,
            limit=limit,
        )
    ).parsed
