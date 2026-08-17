import datetime
from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_event_revisions_response import PublicPmEventRevisionsResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import UNSET, Response, Unset


def _get_kwargs(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    as_of: datetime.datetime | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_as_of: str | Unset = UNSET
    if not isinstance(as_of, Unset):
        json_as_of = as_of.isoformat()
    params["asOf"] = json_as_of

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/events/{source}/{slug}/revisions".format(
            source=quote(str(source), safe=""),
            slug=quote(str(slug), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmEventRevisionsResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmEventRevisionsResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmEventRevisionsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    as_of: datetime.datetime | Unset = UNSET,
) -> Response[Error | PublicPmEventRevisionsResponse]:
    r"""Append-only correction history and point-in-time reconstruction

     Every correction CoinRithm has made to this event's published facts,
    newest first — what changed, from what to what, why, on whose evidence
    (ingest run and raw-capture file), with which parser, and which earlier
    statement it supersedes. Nothing is overwritten; corrections append.

    `effectiveAt` is when the change became true AT THE SOURCE (the venue's
    own settlement time) and is null when the venue states none — it is
    never back-filled with the observation time. `observedAt` is when
    CoinRithm saw it. The two routinely differ by weeks.

    With `asOf`, the response also carries `reconstructed`: the state
    CoinRithm was publishing at that instant, folded by OBSERVATION time.
    That answers \"what did you show on day X\" — cite it rather than
    inferring past state from current values.

    An event with no corrections returns an empty `revisions` array, which
    is a real answer, not an error.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        as_of (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventRevisionsResponse]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
        as_of=as_of,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    as_of: datetime.datetime | Unset = UNSET,
) -> Error | PublicPmEventRevisionsResponse | None:
    r"""Append-only correction history and point-in-time reconstruction

     Every correction CoinRithm has made to this event's published facts,
    newest first — what changed, from what to what, why, on whose evidence
    (ingest run and raw-capture file), with which parser, and which earlier
    statement it supersedes. Nothing is overwritten; corrections append.

    `effectiveAt` is when the change became true AT THE SOURCE (the venue's
    own settlement time) and is null when the venue states none — it is
    never back-filled with the observation time. `observedAt` is when
    CoinRithm saw it. The two routinely differ by weeks.

    With `asOf`, the response also carries `reconstructed`: the state
    CoinRithm was publishing at that instant, folded by OBSERVATION time.
    That answers \"what did you show on day X\" — cite it rather than
    inferring past state from current values.

    An event with no corrections returns an empty `revisions` array, which
    is a real answer, not an error.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        as_of (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventRevisionsResponse
    """

    return sync_detailed(
        source=source,
        slug=slug,
        client=client,
        as_of=as_of,
    ).parsed


async def asyncio_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    as_of: datetime.datetime | Unset = UNSET,
) -> Response[Error | PublicPmEventRevisionsResponse]:
    r"""Append-only correction history and point-in-time reconstruction

     Every correction CoinRithm has made to this event's published facts,
    newest first — what changed, from what to what, why, on whose evidence
    (ingest run and raw-capture file), with which parser, and which earlier
    statement it supersedes. Nothing is overwritten; corrections append.

    `effectiveAt` is when the change became true AT THE SOURCE (the venue's
    own settlement time) and is null when the venue states none — it is
    never back-filled with the observation time. `observedAt` is when
    CoinRithm saw it. The two routinely differ by weeks.

    With `asOf`, the response also carries `reconstructed`: the state
    CoinRithm was publishing at that instant, folded by OBSERVATION time.
    That answers \"what did you show on day X\" — cite it rather than
    inferring past state from current values.

    An event with no corrections returns an empty `revisions` array, which
    is a real answer, not an error.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        as_of (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventRevisionsResponse]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
        as_of=as_of,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    as_of: datetime.datetime | Unset = UNSET,
) -> Error | PublicPmEventRevisionsResponse | None:
    r"""Append-only correction history and point-in-time reconstruction

     Every correction CoinRithm has made to this event's published facts,
    newest first — what changed, from what to what, why, on whose evidence
    (ingest run and raw-capture file), with which parser, and which earlier
    statement it supersedes. Nothing is overwritten; corrections append.

    `effectiveAt` is when the change became true AT THE SOURCE (the venue's
    own settlement time) and is null when the venue states none — it is
    never back-filled with the observation time. `observedAt` is when
    CoinRithm saw it. The two routinely differ by weeks.

    With `asOf`, the response also carries `reconstructed`: the state
    CoinRithm was publishing at that instant, folded by OBSERVATION time.
    That answers \"what did you show on day X\" — cite it rather than
    inferring past state from current values.

    An event with no corrections returns an empty `revisions` array, which
    is a real answer, not an error.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        as_of (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventRevisionsResponse
    """

    return (
        await asyncio_detailed(
            source=source,
            slug=slug,
            client=client,
            as_of=as_of,
        )
    ).parsed
