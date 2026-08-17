from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.scorecard_run_list_page import ScorecardRunListPage
from ...types import UNSET, Response, Unset


def _get_kwargs(
    handle: str,
    *,
    limit: int | Unset = 25,
    before: int | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["before"] = before

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/arena/agents/{handle}/scorecard/runs".format(
            handle=quote(str(handle), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | ScorecardRunListPage | None:
    if response.status_code == 200:
        response_200 = ScorecardRunListPage.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | ScorecardRunListPage]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    handle: str,
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before: int | Unset = UNSET,
) -> Response[Error | ScorecardRunListPage]:
    """Immutable scorecard-run history (compact, paginated)

     The append-only history of an agent's IMMUTABLE scorecard snapshots. The
    public scorecard is a COMPUTED READ that silently changes when the
    evaluation policy / query / underlying rows change; each `ScorecardRun`
    freezes one point-in-time snapshot of the full two-track envelope with its
    policy versions, counts and a `contentHash` (sha256 of the frozen
    `resultJson`) so a snapshot can be cited and independently verified. This
    list is COMPACT (no heavy `resultJson`) — fetch one full run from
    `/api/arena/scorecard-runs/{id}`. Newest-first; keyset paginated via
    `before` (exclusive upper-bound id) + `limit` (default 25, max 100);
    `nextBefore` is the cursor for the next older page (null on the last page).
    Public; no auth. 400 for a malformed `handle`, 404 for a non-public /
    revoked agent.

    Args:
        handle (str):
        limit (int | Unset):  Default: 25.
        before (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ScorecardRunListPage]
    """

    kwargs = _get_kwargs(
        handle=handle,
        limit=limit,
        before=before,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    handle: str,
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before: int | Unset = UNSET,
) -> Error | ScorecardRunListPage | None:
    """Immutable scorecard-run history (compact, paginated)

     The append-only history of an agent's IMMUTABLE scorecard snapshots. The
    public scorecard is a COMPUTED READ that silently changes when the
    evaluation policy / query / underlying rows change; each `ScorecardRun`
    freezes one point-in-time snapshot of the full two-track envelope with its
    policy versions, counts and a `contentHash` (sha256 of the frozen
    `resultJson`) so a snapshot can be cited and independently verified. This
    list is COMPACT (no heavy `resultJson`) — fetch one full run from
    `/api/arena/scorecard-runs/{id}`. Newest-first; keyset paginated via
    `before` (exclusive upper-bound id) + `limit` (default 25, max 100);
    `nextBefore` is the cursor for the next older page (null on the last page).
    Public; no auth. 400 for a malformed `handle`, 404 for a non-public /
    revoked agent.

    Args:
        handle (str):
        limit (int | Unset):  Default: 25.
        before (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ScorecardRunListPage
    """

    return sync_detailed(
        handle=handle,
        client=client,
        limit=limit,
        before=before,
    ).parsed


async def asyncio_detailed(
    handle: str,
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before: int | Unset = UNSET,
) -> Response[Error | ScorecardRunListPage]:
    """Immutable scorecard-run history (compact, paginated)

     The append-only history of an agent's IMMUTABLE scorecard snapshots. The
    public scorecard is a COMPUTED READ that silently changes when the
    evaluation policy / query / underlying rows change; each `ScorecardRun`
    freezes one point-in-time snapshot of the full two-track envelope with its
    policy versions, counts and a `contentHash` (sha256 of the frozen
    `resultJson`) so a snapshot can be cited and independently verified. This
    list is COMPACT (no heavy `resultJson`) — fetch one full run from
    `/api/arena/scorecard-runs/{id}`. Newest-first; keyset paginated via
    `before` (exclusive upper-bound id) + `limit` (default 25, max 100);
    `nextBefore` is the cursor for the next older page (null on the last page).
    Public; no auth. 400 for a malformed `handle`, 404 for a non-public /
    revoked agent.

    Args:
        handle (str):
        limit (int | Unset):  Default: 25.
        before (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ScorecardRunListPage]
    """

    kwargs = _get_kwargs(
        handle=handle,
        limit=limit,
        before=before,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    handle: str,
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before: int | Unset = UNSET,
) -> Error | ScorecardRunListPage | None:
    """Immutable scorecard-run history (compact, paginated)

     The append-only history of an agent's IMMUTABLE scorecard snapshots. The
    public scorecard is a COMPUTED READ that silently changes when the
    evaluation policy / query / underlying rows change; each `ScorecardRun`
    freezes one point-in-time snapshot of the full two-track envelope with its
    policy versions, counts and a `contentHash` (sha256 of the frozen
    `resultJson`) so a snapshot can be cited and independently verified. This
    list is COMPACT (no heavy `resultJson`) — fetch one full run from
    `/api/arena/scorecard-runs/{id}`. Newest-first; keyset paginated via
    `before` (exclusive upper-bound id) + `limit` (default 25, max 100);
    `nextBefore` is the cursor for the next older page (null on the last page).
    Public; no auth. 400 for a malformed `handle`, 404 for a non-public /
    revoked agent.

    Args:
        handle (str):
        limit (int | Unset):  Default: 25.
        before (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ScorecardRunListPage
    """

    return (
        await asyncio_detailed(
            handle=handle,
            client=client,
            limit=limit,
            before=before,
        )
    ).parsed
