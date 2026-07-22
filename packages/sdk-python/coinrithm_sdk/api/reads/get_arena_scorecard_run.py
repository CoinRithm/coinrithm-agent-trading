from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.scorecard_run_detail import ScorecardRunDetail
from typing import cast



def _get_kwargs(
    id: int,

) -> dict[str, Any]:
    

    

    

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/arena/scorecard-runs/{id}".format(id=quote(str(id), safe=""),),
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | ScorecardRunDetail | None:
    if response.status_code == 200:
        response_200 = ScorecardRunDetail.from_dict(response.json())



        return response_200

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())



        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | ScorecardRunDetail]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    id: int,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Error | ScorecardRunDetail]:
    """ One immutable scorecard run (full)

     The full IMMUTABLE scorecard run by id: the frozen `resultJson` (the
    two-track scorecard envelope EXACTLY as it was served when snapshotted),
    its `contentHash` (sha256 of `resultJson` — recompute to verify the
    snapshot was not rewritten), the frozen `cohort` definition it scored over,
    and a `contributions` summary. Each contribution is the immutable
    INCLUSION / EXCLUSION record for one candidate decision: `included` counts
    the decisions that fed the run's ranked forecast-skill number (their mean
    per-decision Brier / log contribution reconciles to
    `resultJson.forecastSkill.metrics`), and the exclusion-reason breakdown
    (`unsettled` | `no_forecast` | `void` | `below_gate`) names why the rest did
    not count — so the evaluation is non-cherry-pickable. Public; no auth. 404
    for an unknown run or a non-public / revoked agent. Immutable — cached long.

    Args:
        id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ScorecardRunDetail]
     """


    kwargs = _get_kwargs(
        id=id,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    id: int,
    *,
    client: AuthenticatedClient | Client,

) -> Error | ScorecardRunDetail | None:
    """ One immutable scorecard run (full)

     The full IMMUTABLE scorecard run by id: the frozen `resultJson` (the
    two-track scorecard envelope EXACTLY as it was served when snapshotted),
    its `contentHash` (sha256 of `resultJson` — recompute to verify the
    snapshot was not rewritten), the frozen `cohort` definition it scored over,
    and a `contributions` summary. Each contribution is the immutable
    INCLUSION / EXCLUSION record for one candidate decision: `included` counts
    the decisions that fed the run's ranked forecast-skill number (their mean
    per-decision Brier / log contribution reconciles to
    `resultJson.forecastSkill.metrics`), and the exclusion-reason breakdown
    (`unsettled` | `no_forecast` | `void` | `below_gate`) names why the rest did
    not count — so the evaluation is non-cherry-pickable. Public; no auth. 404
    for an unknown run or a non-public / revoked agent. Immutable — cached long.

    Args:
        id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ScorecardRunDetail
     """


    return sync_detailed(
        id=id,
client=client,

    ).parsed

async def asyncio_detailed(
    id: int,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Error | ScorecardRunDetail]:
    """ One immutable scorecard run (full)

     The full IMMUTABLE scorecard run by id: the frozen `resultJson` (the
    two-track scorecard envelope EXACTLY as it was served when snapshotted),
    its `contentHash` (sha256 of `resultJson` — recompute to verify the
    snapshot was not rewritten), the frozen `cohort` definition it scored over,
    and a `contributions` summary. Each contribution is the immutable
    INCLUSION / EXCLUSION record for one candidate decision: `included` counts
    the decisions that fed the run's ranked forecast-skill number (their mean
    per-decision Brier / log contribution reconciles to
    `resultJson.forecastSkill.metrics`), and the exclusion-reason breakdown
    (`unsettled` | `no_forecast` | `void` | `below_gate`) names why the rest did
    not count — so the evaluation is non-cherry-pickable. Public; no auth. 404
    for an unknown run or a non-public / revoked agent. Immutable — cached long.

    Args:
        id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ScorecardRunDetail]
     """


    kwargs = _get_kwargs(
        id=id,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    id: int,
    *,
    client: AuthenticatedClient | Client,

) -> Error | ScorecardRunDetail | None:
    """ One immutable scorecard run (full)

     The full IMMUTABLE scorecard run by id: the frozen `resultJson` (the
    two-track scorecard envelope EXACTLY as it was served when snapshotted),
    its `contentHash` (sha256 of `resultJson` — recompute to verify the
    snapshot was not rewritten), the frozen `cohort` definition it scored over,
    and a `contributions` summary. Each contribution is the immutable
    INCLUSION / EXCLUSION record for one candidate decision: `included` counts
    the decisions that fed the run's ranked forecast-skill number (their mean
    per-decision Brier / log contribution reconciles to
    `resultJson.forecastSkill.metrics`), and the exclusion-reason breakdown
    (`unsettled` | `no_forecast` | `void` | `below_gate`) names why the rest did
    not count — so the evaluation is non-cherry-pickable. Public; no auth. 404
    for an unknown run or a non-public / revoked agent. Immutable — cached long.

    Args:
        id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ScorecardRunDetail
     """


    return (await asyncio_detailed(
        id=id,
client=client,

    )).parsed
