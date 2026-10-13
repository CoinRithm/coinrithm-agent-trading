from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.pm_paper_v2_discovery_response import PmPaperV2DiscoveryResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    q: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["q"] = q

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/pm/v2/discover",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PmPaperV2DiscoveryResponse | None:
    if response.status_code == 200:
        response_200 = PmPaperV2DiscoveryResponse.from_dict(response.json())

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

    if response.status_code == 503:
        response_503 = Error.from_dict(response.json())

        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PmPaperV2DiscoveryResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    q: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> Response[Error | PmPaperV2DiscoveryResponse]:
    """Discover candidates for the acquired-book PM paper model (pm_paper_v2)

     Candidate list for `pm_paper_v2`, the paper model that fills against
    an order book acquired from the venue at entry time. Only keys
    enrolled as a server-configured house agent may call it; any other
    key receives 403 `house_opt_in_required`.

    Built from the same cached discovery set as /api/agent/pm/discover
    (all sources, `best` sort, offset 0), then filtered per request: an
    outcome is kept only when its exact stored native identity resolves
    (Polymarket condition + token, or Kalshi ticker + side), it is not a
    Polymarket negative-risk contract, and, when the house has a
    `maxEndDays` bound, its scheduled native end falls inside it. Events
    left with no outcome are dropped; `meta.boundedSelection` counts
    what was removed and why. Dates are stored provider fields, not a
    settlement guarantee; entry re-acquires identity, maturity, book and
    fees. Only `q` and `limit` are accepted; any other query parameter
    returns 400. The legacy `quoteHint` on each market still points at
    the v1 quote endpoint. Requires scope `read`.

    Args:
        q (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmPaperV2DiscoveryResponse]
    """

    kwargs = _get_kwargs(
        q=q,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    q: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> Error | PmPaperV2DiscoveryResponse | None:
    """Discover candidates for the acquired-book PM paper model (pm_paper_v2)

     Candidate list for `pm_paper_v2`, the paper model that fills against
    an order book acquired from the venue at entry time. Only keys
    enrolled as a server-configured house agent may call it; any other
    key receives 403 `house_opt_in_required`.

    Built from the same cached discovery set as /api/agent/pm/discover
    (all sources, `best` sort, offset 0), then filtered per request: an
    outcome is kept only when its exact stored native identity resolves
    (Polymarket condition + token, or Kalshi ticker + side), it is not a
    Polymarket negative-risk contract, and, when the house has a
    `maxEndDays` bound, its scheduled native end falls inside it. Events
    left with no outcome are dropped; `meta.boundedSelection` counts
    what was removed and why. Dates are stored provider fields, not a
    settlement guarantee; entry re-acquires identity, maturity, book and
    fees. Only `q` and `limit` are accepted; any other query parameter
    returns 400. The legacy `quoteHint` on each market still points at
    the v1 quote endpoint. Requires scope `read`.

    Args:
        q (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmPaperV2DiscoveryResponse
    """

    return sync_detailed(
        client=client,
        q=q,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    q: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> Response[Error | PmPaperV2DiscoveryResponse]:
    """Discover candidates for the acquired-book PM paper model (pm_paper_v2)

     Candidate list for `pm_paper_v2`, the paper model that fills against
    an order book acquired from the venue at entry time. Only keys
    enrolled as a server-configured house agent may call it; any other
    key receives 403 `house_opt_in_required`.

    Built from the same cached discovery set as /api/agent/pm/discover
    (all sources, `best` sort, offset 0), then filtered per request: an
    outcome is kept only when its exact stored native identity resolves
    (Polymarket condition + token, or Kalshi ticker + side), it is not a
    Polymarket negative-risk contract, and, when the house has a
    `maxEndDays` bound, its scheduled native end falls inside it. Events
    left with no outcome are dropped; `meta.boundedSelection` counts
    what was removed and why. Dates are stored provider fields, not a
    settlement guarantee; entry re-acquires identity, maturity, book and
    fees. Only `q` and `limit` are accepted; any other query parameter
    returns 400. The legacy `quoteHint` on each market still points at
    the v1 quote endpoint. Requires scope `read`.

    Args:
        q (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmPaperV2DiscoveryResponse]
    """

    kwargs = _get_kwargs(
        q=q,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    q: str | Unset = UNSET,
    limit: int | Unset = 20,
) -> Error | PmPaperV2DiscoveryResponse | None:
    """Discover candidates for the acquired-book PM paper model (pm_paper_v2)

     Candidate list for `pm_paper_v2`, the paper model that fills against
    an order book acquired from the venue at entry time. Only keys
    enrolled as a server-configured house agent may call it; any other
    key receives 403 `house_opt_in_required`.

    Built from the same cached discovery set as /api/agent/pm/discover
    (all sources, `best` sort, offset 0), then filtered per request: an
    outcome is kept only when its exact stored native identity resolves
    (Polymarket condition + token, or Kalshi ticker + side), it is not a
    Polymarket negative-risk contract, and, when the house has a
    `maxEndDays` bound, its scheduled native end falls inside it. Events
    left with no outcome are dropped; `meta.boundedSelection` counts
    what was removed and why. Dates are stored provider fields, not a
    settlement guarantee; entry re-acquires identity, maturity, book and
    fees. Only `q` and `limit` are accepted; any other query parameter
    returns 400. The legacy `quoteHint` on each market still points at
    the v1 quote endpoint. Requires scope `read`.

    Args:
        q (str | Unset):
        limit (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmPaperV2DiscoveryResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            q=q,
            limit=limit,
        )
    ).parsed
