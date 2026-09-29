from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_resolved_events_response import PublicPmResolvedEventsResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    min_volume: float | Unset = 0.0,
    year: int | Unset = UNSET,
    month: int | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["offset"] = offset

    params["fiat"] = fiat

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    params["minVolume"] = min_volume

    params["year"] = year

    params["month"] = month

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/resolved",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmResolvedEventsResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmResolvedEventsResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmResolvedEventsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    min_volume: float | Unset = 0.0,
    year: int | Unset = UNSET,
    month: int | Unset = UNSET,
) -> Response[Error | PublicPmResolvedEventsResponse]:
    r"""Resolved prediction-market events archive

     Keyless archive of closed, definitively-resolved events across all
    supported venues, newest settlement first. Outcome probabilities are
    0-100 points, matching `PublicPmOutcome.probability`.

    `resolvedAt` is populated only when the source-reported resolution
    time is provider-verified (`resolvedAtVerified: true`); otherwise it
    is null and `closedAt` carries a real observed close time instead —
    never a fabricated settlement date.

    Pass `year` (and optionally `month`, 1-12) to page one calendar slice
    instead of the unbounded archive walk; `month` without `year` is
    rejected with 400. A slice raises the per-page ceiling to 200 rows;
    the unbounded walk stays at 100. `minVolume` turns the feed into a
    \"recent AND substantial\" tape: when set, `meta.totalResolved` is null
    (the archive count is not volume-filtered) and `meta.minVolume`
    echoes the floor instead, so a slice total is never mistaken for the
    venue's lifetime total.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        min_volume (float | Unset):  Default: 0.0.
        year (int | Unset):
        month (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmResolvedEventsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        fiat=fiat,
        source=source,
        min_volume=min_volume,
        year=year,
        month=month,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    min_volume: float | Unset = 0.0,
    year: int | Unset = UNSET,
    month: int | Unset = UNSET,
) -> Error | PublicPmResolvedEventsResponse | None:
    r"""Resolved prediction-market events archive

     Keyless archive of closed, definitively-resolved events across all
    supported venues, newest settlement first. Outcome probabilities are
    0-100 points, matching `PublicPmOutcome.probability`.

    `resolvedAt` is populated only when the source-reported resolution
    time is provider-verified (`resolvedAtVerified: true`); otherwise it
    is null and `closedAt` carries a real observed close time instead —
    never a fabricated settlement date.

    Pass `year` (and optionally `month`, 1-12) to page one calendar slice
    instead of the unbounded archive walk; `month` without `year` is
    rejected with 400. A slice raises the per-page ceiling to 200 rows;
    the unbounded walk stays at 100. `minVolume` turns the feed into a
    \"recent AND substantial\" tape: when set, `meta.totalResolved` is null
    (the archive count is not volume-filtered) and `meta.minVolume`
    echoes the floor instead, so a slice total is never mistaken for the
    venue's lifetime total.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        min_volume (float | Unset):  Default: 0.0.
        year (int | Unset):
        month (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmResolvedEventsResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        offset=offset,
        fiat=fiat,
        source=source,
        min_volume=min_volume,
        year=year,
        month=month,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    min_volume: float | Unset = 0.0,
    year: int | Unset = UNSET,
    month: int | Unset = UNSET,
) -> Response[Error | PublicPmResolvedEventsResponse]:
    r"""Resolved prediction-market events archive

     Keyless archive of closed, definitively-resolved events across all
    supported venues, newest settlement first. Outcome probabilities are
    0-100 points, matching `PublicPmOutcome.probability`.

    `resolvedAt` is populated only when the source-reported resolution
    time is provider-verified (`resolvedAtVerified: true`); otherwise it
    is null and `closedAt` carries a real observed close time instead —
    never a fabricated settlement date.

    Pass `year` (and optionally `month`, 1-12) to page one calendar slice
    instead of the unbounded archive walk; `month` without `year` is
    rejected with 400. A slice raises the per-page ceiling to 200 rows;
    the unbounded walk stays at 100. `minVolume` turns the feed into a
    \"recent AND substantial\" tape: when set, `meta.totalResolved` is null
    (the archive count is not volume-filtered) and `meta.minVolume`
    echoes the floor instead, so a slice total is never mistaken for the
    venue's lifetime total.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        min_volume (float | Unset):  Default: 0.0.
        year (int | Unset):
        month (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmResolvedEventsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        fiat=fiat,
        source=source,
        min_volume=min_volume,
        year=year,
        month=month,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    min_volume: float | Unset = 0.0,
    year: int | Unset = UNSET,
    month: int | Unset = UNSET,
) -> Error | PublicPmResolvedEventsResponse | None:
    r"""Resolved prediction-market events archive

     Keyless archive of closed, definitively-resolved events across all
    supported venues, newest settlement first. Outcome probabilities are
    0-100 points, matching `PublicPmOutcome.probability`.

    `resolvedAt` is populated only when the source-reported resolution
    time is provider-verified (`resolvedAtVerified: true`); otherwise it
    is null and `closedAt` carries a real observed close time instead —
    never a fabricated settlement date.

    Pass `year` (and optionally `month`, 1-12) to page one calendar slice
    instead of the unbounded archive walk; `month` without `year` is
    rejected with 400. A slice raises the per-page ceiling to 200 rows;
    the unbounded walk stays at 100. `minVolume` turns the feed into a
    \"recent AND substantial\" tape: when set, `meta.totalResolved` is null
    (the archive count is not volume-filtered) and `meta.minVolume`
    echoes the floor instead, so a slice total is never mistaken for the
    venue's lifetime total.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        min_volume (float | Unset):  Default: 0.0.
        year (int | Unset):
        month (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmResolvedEventsResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            offset=offset,
            fiat=fiat,
            source=source,
            min_volume=min_volume,
            year=year,
            month=month,
        )
    ).parsed
