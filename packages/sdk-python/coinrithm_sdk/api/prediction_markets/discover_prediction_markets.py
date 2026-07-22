from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.discover_prediction_markets_sort import DiscoverPredictionMarketsSort
from ...models.discover_prediction_markets_source import DiscoverPredictionMarketsSource
from ...models.error import Error
from ...models.pm_discovery_response import PmDiscoveryResponse
from ...types import UNSET, Unset
from typing import cast



def _get_kwargs(
    *,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    source: DiscoverPredictionMarketsSource | Unset = DiscoverPredictionMarketsSource.ALL,
    sort: DiscoverPredictionMarketsSort | Unset = DiscoverPredictionMarketsSort.BEST,

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["offset"] = offset

    params["q"] = q

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    json_sort: str | Unset = UNSET
    if not isinstance(sort, Unset):
        json_sort = sort.value

    params["sort"] = json_sort


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/pm/discover",
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | PmDiscoveryResponse | None:
    if response.status_code == 200:
        response_200 = PmDiscoveryResponse.from_dict(response.json())



        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())



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

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | PmDiscoveryResponse]:
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
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    source: DiscoverPredictionMarketsSource | Unset = DiscoverPredictionMarketsSource.ALL,
    sort: DiscoverPredictionMarketsSort | Unset = DiscoverPredictionMarketsSort.BEST,

) -> Response[Error | PmDiscoveryResponse]:
    """ Discover active-open prediction markets for quoting

     Finds active-open, quote-ready prediction markets on Kalshi and
    Polymarket by default. Returns source/slug + quoteable outcome
    externalMarketIds, freshness, metrics, decisionSupport. Requires scope
    `read`. Call pm/quote with a returned externalMarketId before pm/open.

    Results are ordered openable-markets-first (then effectively-decided
    `pinned` markets last). Each market carries `eligible` /
    `eligibleBlockReasons` (and each outcome an `eligible`) so an agent can
    skip multi-outcome / non-binary / non-openable books before wasting a
    quote.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        source (DiscoverPredictionMarketsSource | Unset):  Default:
            DiscoverPredictionMarketsSource.ALL.
        sort (DiscoverPredictionMarketsSort | Unset):  Default:
            DiscoverPredictionMarketsSort.BEST.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmDiscoveryResponse]
     """


    kwargs = _get_kwargs(
        limit=limit,
offset=offset,
q=q,
source=source,
sort=sort,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    source: DiscoverPredictionMarketsSource | Unset = DiscoverPredictionMarketsSource.ALL,
    sort: DiscoverPredictionMarketsSort | Unset = DiscoverPredictionMarketsSort.BEST,

) -> Error | PmDiscoveryResponse | None:
    """ Discover active-open prediction markets for quoting

     Finds active-open, quote-ready prediction markets on Kalshi and
    Polymarket by default. Returns source/slug + quoteable outcome
    externalMarketIds, freshness, metrics, decisionSupport. Requires scope
    `read`. Call pm/quote with a returned externalMarketId before pm/open.

    Results are ordered openable-markets-first (then effectively-decided
    `pinned` markets last). Each market carries `eligible` /
    `eligibleBlockReasons` (and each outcome an `eligible`) so an agent can
    skip multi-outcome / non-binary / non-openable books before wasting a
    quote.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        source (DiscoverPredictionMarketsSource | Unset):  Default:
            DiscoverPredictionMarketsSource.ALL.
        sort (DiscoverPredictionMarketsSort | Unset):  Default:
            DiscoverPredictionMarketsSort.BEST.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmDiscoveryResponse
     """


    return sync_detailed(
        client=client,
limit=limit,
offset=offset,
q=q,
source=source,
sort=sort,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    source: DiscoverPredictionMarketsSource | Unset = DiscoverPredictionMarketsSource.ALL,
    sort: DiscoverPredictionMarketsSort | Unset = DiscoverPredictionMarketsSort.BEST,

) -> Response[Error | PmDiscoveryResponse]:
    """ Discover active-open prediction markets for quoting

     Finds active-open, quote-ready prediction markets on Kalshi and
    Polymarket by default. Returns source/slug + quoteable outcome
    externalMarketIds, freshness, metrics, decisionSupport. Requires scope
    `read`. Call pm/quote with a returned externalMarketId before pm/open.

    Results are ordered openable-markets-first (then effectively-decided
    `pinned` markets last). Each market carries `eligible` /
    `eligibleBlockReasons` (and each outcome an `eligible`) so an agent can
    skip multi-outcome / non-binary / non-openable books before wasting a
    quote.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        source (DiscoverPredictionMarketsSource | Unset):  Default:
            DiscoverPredictionMarketsSource.ALL.
        sort (DiscoverPredictionMarketsSort | Unset):  Default:
            DiscoverPredictionMarketsSort.BEST.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmDiscoveryResponse]
     """


    kwargs = _get_kwargs(
        limit=limit,
offset=offset,
q=q,
source=source,
sort=sort,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    source: DiscoverPredictionMarketsSource | Unset = DiscoverPredictionMarketsSource.ALL,
    sort: DiscoverPredictionMarketsSort | Unset = DiscoverPredictionMarketsSort.BEST,

) -> Error | PmDiscoveryResponse | None:
    """ Discover active-open prediction markets for quoting

     Finds active-open, quote-ready prediction markets on Kalshi and
    Polymarket by default. Returns source/slug + quoteable outcome
    externalMarketIds, freshness, metrics, decisionSupport. Requires scope
    `read`. Call pm/quote with a returned externalMarketId before pm/open.

    Results are ordered openable-markets-first (then effectively-decided
    `pinned` markets last). Each market carries `eligible` /
    `eligibleBlockReasons` (and each outcome an `eligible`) so an agent can
    skip multi-outcome / non-binary / non-openable books before wasting a
    quote.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        source (DiscoverPredictionMarketsSource | Unset):  Default:
            DiscoverPredictionMarketsSource.ALL.
        sort (DiscoverPredictionMarketsSort | Unset):  Default:
            DiscoverPredictionMarketsSort.BEST.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmDiscoveryResponse
     """


    return (await asyncio_detailed(
        client=client,
limit=limit,
offset=offset,
q=q,
source=source,
sort=sort,

    )).parsed
