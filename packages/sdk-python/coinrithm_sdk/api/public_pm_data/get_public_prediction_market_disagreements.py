from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_public_prediction_market_disagreements_sort import GetPublicPredictionMarketDisagreementsSort
from ...models.get_public_prediction_market_disagreements_source_kind import (
    GetPublicPredictionMarketDisagreementsSourceKind,
)
from ...models.get_public_prediction_market_disagreements_status import GetPublicPredictionMarketDisagreementsStatus
from ...models.public_pm_disagreements_response import PublicPmDisagreementsResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 10,
    offset: int | Unset = 0,
    sort: GetPublicPredictionMarketDisagreementsSort
    | Unset = GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC,
    min_divergence: float | Unset = 0.0,
    source_kind: GetPublicPredictionMarketDisagreementsSourceKind | Unset = UNSET,
    status: GetPublicPredictionMarketDisagreementsStatus | Unset = UNSET,
    max_snapshot_age_minutes: float | Unset = UNSET,
    require_priced: bool | Unset = True,
    fiat: str | Unset = "USD",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["offset"] = offset

    json_sort: str | Unset = UNSET
    if not isinstance(sort, Unset):
        json_sort = sort.value

    params["sort"] = json_sort

    params["minDivergence"] = min_divergence

    json_source_kind: str | Unset = UNSET
    if not isinstance(source_kind, Unset):
        json_source_kind = source_kind.value

    params["sourceKind"] = json_source_kind

    json_status: str | Unset = UNSET
    if not isinstance(status, Unset):
        json_status = status.value

    params["status"] = json_status

    params["maxSnapshotAgeMinutes"] = max_snapshot_age_minutes

    params["requirePriced"] = require_priced

    params["fiat"] = fiat

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/matches/public",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmDisagreementsResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmDisagreementsResponse.from_dict(response.json())

        return response_200

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmDisagreementsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 10,
    offset: int | Unset = 0,
    sort: GetPublicPredictionMarketDisagreementsSort
    | Unset = GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC,
    min_divergence: float | Unset = 0.0,
    source_kind: GetPublicPredictionMarketDisagreementsSourceKind | Unset = UNSET,
    status: GetPublicPredictionMarketDisagreementsStatus | Unset = UNSET,
    max_snapshot_age_minutes: float | Unset = UNSET,
    require_priced: bool | Unset = True,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicPmDisagreementsResponse]:
    """Cross-venue disagreement clusters (approved matches)

     Keyless graph-clustered view of events CoinRithm has matched as the
    same real-world question across 2+ venues, with pairwise comparisons
    carrying per-shared-outcome probability deltas. Orientation between
    matched markets is human/aggregator-reviewed, never price-inferred.
    For bounded agent context use the MCP `pm_data_disagreements` tool,
    which additionally bounds each event and comparison to its top-5
    highest-delta shared outcomes.

    Args:
        limit (int | Unset):  Default: 10.
        offset (int | Unset):  Default: 0.
        sort (GetPublicPredictionMarketDisagreementsSort | Unset):  Default:
            GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC.
        min_divergence (float | Unset):  Default: 0.0.
        source_kind (GetPublicPredictionMarketDisagreementsSourceKind | Unset):
        status (GetPublicPredictionMarketDisagreementsStatus | Unset):
        max_snapshot_age_minutes (float | Unset):
        require_priced (bool | Unset):  Default: True.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmDisagreementsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        sort=sort,
        min_divergence=min_divergence,
        source_kind=source_kind,
        status=status,
        max_snapshot_age_minutes=max_snapshot_age_minutes,
        require_priced=require_priced,
        fiat=fiat,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 10,
    offset: int | Unset = 0,
    sort: GetPublicPredictionMarketDisagreementsSort
    | Unset = GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC,
    min_divergence: float | Unset = 0.0,
    source_kind: GetPublicPredictionMarketDisagreementsSourceKind | Unset = UNSET,
    status: GetPublicPredictionMarketDisagreementsStatus | Unset = UNSET,
    max_snapshot_age_minutes: float | Unset = UNSET,
    require_priced: bool | Unset = True,
    fiat: str | Unset = "USD",
) -> Error | PublicPmDisagreementsResponse | None:
    """Cross-venue disagreement clusters (approved matches)

     Keyless graph-clustered view of events CoinRithm has matched as the
    same real-world question across 2+ venues, with pairwise comparisons
    carrying per-shared-outcome probability deltas. Orientation between
    matched markets is human/aggregator-reviewed, never price-inferred.
    For bounded agent context use the MCP `pm_data_disagreements` tool,
    which additionally bounds each event and comparison to its top-5
    highest-delta shared outcomes.

    Args:
        limit (int | Unset):  Default: 10.
        offset (int | Unset):  Default: 0.
        sort (GetPublicPredictionMarketDisagreementsSort | Unset):  Default:
            GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC.
        min_divergence (float | Unset):  Default: 0.0.
        source_kind (GetPublicPredictionMarketDisagreementsSourceKind | Unset):
        status (GetPublicPredictionMarketDisagreementsStatus | Unset):
        max_snapshot_age_minutes (float | Unset):
        require_priced (bool | Unset):  Default: True.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmDisagreementsResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        offset=offset,
        sort=sort,
        min_divergence=min_divergence,
        source_kind=source_kind,
        status=status,
        max_snapshot_age_minutes=max_snapshot_age_minutes,
        require_priced=require_priced,
        fiat=fiat,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 10,
    offset: int | Unset = 0,
    sort: GetPublicPredictionMarketDisagreementsSort
    | Unset = GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC,
    min_divergence: float | Unset = 0.0,
    source_kind: GetPublicPredictionMarketDisagreementsSourceKind | Unset = UNSET,
    status: GetPublicPredictionMarketDisagreementsStatus | Unset = UNSET,
    max_snapshot_age_minutes: float | Unset = UNSET,
    require_priced: bool | Unset = True,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicPmDisagreementsResponse]:
    """Cross-venue disagreement clusters (approved matches)

     Keyless graph-clustered view of events CoinRithm has matched as the
    same real-world question across 2+ venues, with pairwise comparisons
    carrying per-shared-outcome probability deltas. Orientation between
    matched markets is human/aggregator-reviewed, never price-inferred.
    For bounded agent context use the MCP `pm_data_disagreements` tool,
    which additionally bounds each event and comparison to its top-5
    highest-delta shared outcomes.

    Args:
        limit (int | Unset):  Default: 10.
        offset (int | Unset):  Default: 0.
        sort (GetPublicPredictionMarketDisagreementsSort | Unset):  Default:
            GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC.
        min_divergence (float | Unset):  Default: 0.0.
        source_kind (GetPublicPredictionMarketDisagreementsSourceKind | Unset):
        status (GetPublicPredictionMarketDisagreementsStatus | Unset):
        max_snapshot_age_minutes (float | Unset):
        require_priced (bool | Unset):  Default: True.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmDisagreementsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        sort=sort,
        min_divergence=min_divergence,
        source_kind=source_kind,
        status=status,
        max_snapshot_age_minutes=max_snapshot_age_minutes,
        require_priced=require_priced,
        fiat=fiat,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 10,
    offset: int | Unset = 0,
    sort: GetPublicPredictionMarketDisagreementsSort
    | Unset = GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC,
    min_divergence: float | Unset = 0.0,
    source_kind: GetPublicPredictionMarketDisagreementsSourceKind | Unset = UNSET,
    status: GetPublicPredictionMarketDisagreementsStatus | Unset = UNSET,
    max_snapshot_age_minutes: float | Unset = UNSET,
    require_priced: bool | Unset = True,
    fiat: str | Unset = "USD",
) -> Error | PublicPmDisagreementsResponse | None:
    """Cross-venue disagreement clusters (approved matches)

     Keyless graph-clustered view of events CoinRithm has matched as the
    same real-world question across 2+ venues, with pairwise comparisons
    carrying per-shared-outcome probability deltas. Orientation between
    matched markets is human/aggregator-reviewed, never price-inferred.
    For bounded agent context use the MCP `pm_data_disagreements` tool,
    which additionally bounds each event and comparison to its top-5
    highest-delta shared outcomes.

    Args:
        limit (int | Unset):  Default: 10.
        offset (int | Unset):  Default: 0.
        sort (GetPublicPredictionMarketDisagreementsSort | Unset):  Default:
            GetPublicPredictionMarketDisagreementsSort.CONFIDENCE_DESC.
        min_divergence (float | Unset):  Default: 0.0.
        source_kind (GetPublicPredictionMarketDisagreementsSourceKind | Unset):
        status (GetPublicPredictionMarketDisagreementsStatus | Unset):
        max_snapshot_age_minutes (float | Unset):
        require_priced (bool | Unset):  Default: True.
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmDisagreementsResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            offset=offset,
            sort=sort,
            min_divergence=min_divergence,
            source_kind=source_kind,
            status=status,
            max_snapshot_age_minutes=max_snapshot_age_minutes,
            require_priced=require_priced,
            fiat=fiat,
        )
    ).parsed
