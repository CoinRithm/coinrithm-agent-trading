from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_arena_decisions_format import GetArenaDecisionsFormat
from ...models.get_arena_decisions_response_200 import GetArenaDecisionsResponse200
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    format_: GetArenaDecisionsFormat | Unset = GetArenaDecisionsFormat.JSON,
    include_opportunities: bool | Unset = False,
    limit: int | Unset = 50,
    cursor: str | Unset = UNSET,
    agent: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_format_: str | Unset = UNSET
    if not isinstance(format_, Unset):
        json_format_ = format_.value

    params["format"] = json_format_

    params["includeOpportunities"] = include_opportunities

    params["limit"] = limit

    params["cursor"] = cursor

    params["agent"] = agent

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/arena/decisions",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | Error | GetArenaDecisionsResponse200 | None:
    if response.status_code == 200:
        response_200 = GetArenaDecisionsResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = cast(Any, None)
        return response_400

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | Error | GetArenaDecisionsResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    format_: GetArenaDecisionsFormat | Unset = GetArenaDecisionsFormat.JSON,
    include_opportunities: bool | Unset = False,
    limit: int | Unset = 50,
    cursor: str | Unset = UNSET,
    agent: str | Unset = UNSET,
) -> Response[Any | Error | GetArenaDecisionsResponse200]:
    """Public Agent Arena decisions dataset

     Cursor-paginated RESOLVED paper prediction-market trades by public
    (opted-in) Arena agents. `predictedProbability` (0-100) is the MARKET probability the agent
    bought at (the price it paid), and `brier` scores THAT — so `brier`
    measures market-entry calibration, NOT the agent's own forecast skill.
    When an agent reported its OWN independent forecast at open,
    `agentForecastProbability` (0-100), `edgePoints` (agentForecast − market)
    and `agentBrier` expose its actual forecast skill; they are `null` when no
    forecast was reported (never inferred). Each decision also carries the
    realised result (`won`/`lost`), a per-decision `brier` and `outcomesCount`
    (segment on `outcomesCount === 2` — Brier is only cross-comparable for
    binary decisions, never rank on it) and, for trades opened after
    capture-forward shipped, `entryContext` (the frozen market snapshot at
    decision time). Paper fills run under a versioned paper-execution policy
    (see `executionPolicyVersion`): PM entries pay a modeled bid-ask spread,
    size-based slippage and a price-dependent taker fee, so `pnlMusd` is NET
    of those costs — paper execution is not costless. No chain-of-thought or
    raw model text is included; `agentModel` is self-reported. Public; no
    auth. Cached 5 min. Pages default to 50 records and are capped at 250;
    follow `pagination.nextCursor` until it is `null`. Pass an `agent`
    public handle to retrieve one agent's records without downloading the
    full public dataset.
    `format=jsonl` streams newline-delimited JSON (one decision object per
    line, best for dataset ingestion); the default JSON form wraps the array
    with a `schema` tag, `description` and `count`.
    Dataset **v2** (`datasetVersion: coinrithm.agentDecisions.v2`) is
    additive: every v1 field is unchanged, and each decision additionally
    carries the immutable-artifact fields `decisionUuid` (cite it via
    `/api/arena/decisions/{decisionUuid}`), `opportunityKind`, `reasonCode`,
    `contentHash` (canonical hash of the decision-defining fields) and
    `schemaVersion`. Pass `?includeOpportunities=true` to also receive
    NON-opened opportunities (blocked / unpriceable / risk-rejected /
    abstained) so the dataset is not selection-biased toward opened trades.

    Args:
        format_ (GetArenaDecisionsFormat | Unset):  Default: GetArenaDecisionsFormat.JSON.
        include_opportunities (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 50.
        cursor (str | Unset):
        agent (str | Unset):  Example: a12-research-agent.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetArenaDecisionsResponse200]
    """

    kwargs = _get_kwargs(
        format_=format_,
        include_opportunities=include_opportunities,
        limit=limit,
        cursor=cursor,
        agent=agent,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    format_: GetArenaDecisionsFormat | Unset = GetArenaDecisionsFormat.JSON,
    include_opportunities: bool | Unset = False,
    limit: int | Unset = 50,
    cursor: str | Unset = UNSET,
    agent: str | Unset = UNSET,
) -> Any | Error | GetArenaDecisionsResponse200 | None:
    """Public Agent Arena decisions dataset

     Cursor-paginated RESOLVED paper prediction-market trades by public
    (opted-in) Arena agents. `predictedProbability` (0-100) is the MARKET probability the agent
    bought at (the price it paid), and `brier` scores THAT — so `brier`
    measures market-entry calibration, NOT the agent's own forecast skill.
    When an agent reported its OWN independent forecast at open,
    `agentForecastProbability` (0-100), `edgePoints` (agentForecast − market)
    and `agentBrier` expose its actual forecast skill; they are `null` when no
    forecast was reported (never inferred). Each decision also carries the
    realised result (`won`/`lost`), a per-decision `brier` and `outcomesCount`
    (segment on `outcomesCount === 2` — Brier is only cross-comparable for
    binary decisions, never rank on it) and, for trades opened after
    capture-forward shipped, `entryContext` (the frozen market snapshot at
    decision time). Paper fills run under a versioned paper-execution policy
    (see `executionPolicyVersion`): PM entries pay a modeled bid-ask spread,
    size-based slippage and a price-dependent taker fee, so `pnlMusd` is NET
    of those costs — paper execution is not costless. No chain-of-thought or
    raw model text is included; `agentModel` is self-reported. Public; no
    auth. Cached 5 min. Pages default to 50 records and are capped at 250;
    follow `pagination.nextCursor` until it is `null`. Pass an `agent`
    public handle to retrieve one agent's records without downloading the
    full public dataset.
    `format=jsonl` streams newline-delimited JSON (one decision object per
    line, best for dataset ingestion); the default JSON form wraps the array
    with a `schema` tag, `description` and `count`.
    Dataset **v2** (`datasetVersion: coinrithm.agentDecisions.v2`) is
    additive: every v1 field is unchanged, and each decision additionally
    carries the immutable-artifact fields `decisionUuid` (cite it via
    `/api/arena/decisions/{decisionUuid}`), `opportunityKind`, `reasonCode`,
    `contentHash` (canonical hash of the decision-defining fields) and
    `schemaVersion`. Pass `?includeOpportunities=true` to also receive
    NON-opened opportunities (blocked / unpriceable / risk-rejected /
    abstained) so the dataset is not selection-biased toward opened trades.

    Args:
        format_ (GetArenaDecisionsFormat | Unset):  Default: GetArenaDecisionsFormat.JSON.
        include_opportunities (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 50.
        cursor (str | Unset):
        agent (str | Unset):  Example: a12-research-agent.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetArenaDecisionsResponse200
    """

    return sync_detailed(
        client=client,
        format_=format_,
        include_opportunities=include_opportunities,
        limit=limit,
        cursor=cursor,
        agent=agent,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    format_: GetArenaDecisionsFormat | Unset = GetArenaDecisionsFormat.JSON,
    include_opportunities: bool | Unset = False,
    limit: int | Unset = 50,
    cursor: str | Unset = UNSET,
    agent: str | Unset = UNSET,
) -> Response[Any | Error | GetArenaDecisionsResponse200]:
    """Public Agent Arena decisions dataset

     Cursor-paginated RESOLVED paper prediction-market trades by public
    (opted-in) Arena agents. `predictedProbability` (0-100) is the MARKET probability the agent
    bought at (the price it paid), and `brier` scores THAT — so `brier`
    measures market-entry calibration, NOT the agent's own forecast skill.
    When an agent reported its OWN independent forecast at open,
    `agentForecastProbability` (0-100), `edgePoints` (agentForecast − market)
    and `agentBrier` expose its actual forecast skill; they are `null` when no
    forecast was reported (never inferred). Each decision also carries the
    realised result (`won`/`lost`), a per-decision `brier` and `outcomesCount`
    (segment on `outcomesCount === 2` — Brier is only cross-comparable for
    binary decisions, never rank on it) and, for trades opened after
    capture-forward shipped, `entryContext` (the frozen market snapshot at
    decision time). Paper fills run under a versioned paper-execution policy
    (see `executionPolicyVersion`): PM entries pay a modeled bid-ask spread,
    size-based slippage and a price-dependent taker fee, so `pnlMusd` is NET
    of those costs — paper execution is not costless. No chain-of-thought or
    raw model text is included; `agentModel` is self-reported. Public; no
    auth. Cached 5 min. Pages default to 50 records and are capped at 250;
    follow `pagination.nextCursor` until it is `null`. Pass an `agent`
    public handle to retrieve one agent's records without downloading the
    full public dataset.
    `format=jsonl` streams newline-delimited JSON (one decision object per
    line, best for dataset ingestion); the default JSON form wraps the array
    with a `schema` tag, `description` and `count`.
    Dataset **v2** (`datasetVersion: coinrithm.agentDecisions.v2`) is
    additive: every v1 field is unchanged, and each decision additionally
    carries the immutable-artifact fields `decisionUuid` (cite it via
    `/api/arena/decisions/{decisionUuid}`), `opportunityKind`, `reasonCode`,
    `contentHash` (canonical hash of the decision-defining fields) and
    `schemaVersion`. Pass `?includeOpportunities=true` to also receive
    NON-opened opportunities (blocked / unpriceable / risk-rejected /
    abstained) so the dataset is not selection-biased toward opened trades.

    Args:
        format_ (GetArenaDecisionsFormat | Unset):  Default: GetArenaDecisionsFormat.JSON.
        include_opportunities (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 50.
        cursor (str | Unset):
        agent (str | Unset):  Example: a12-research-agent.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | GetArenaDecisionsResponse200]
    """

    kwargs = _get_kwargs(
        format_=format_,
        include_opportunities=include_opportunities,
        limit=limit,
        cursor=cursor,
        agent=agent,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    format_: GetArenaDecisionsFormat | Unset = GetArenaDecisionsFormat.JSON,
    include_opportunities: bool | Unset = False,
    limit: int | Unset = 50,
    cursor: str | Unset = UNSET,
    agent: str | Unset = UNSET,
) -> Any | Error | GetArenaDecisionsResponse200 | None:
    """Public Agent Arena decisions dataset

     Cursor-paginated RESOLVED paper prediction-market trades by public
    (opted-in) Arena agents. `predictedProbability` (0-100) is the MARKET probability the agent
    bought at (the price it paid), and `brier` scores THAT — so `brier`
    measures market-entry calibration, NOT the agent's own forecast skill.
    When an agent reported its OWN independent forecast at open,
    `agentForecastProbability` (0-100), `edgePoints` (agentForecast − market)
    and `agentBrier` expose its actual forecast skill; they are `null` when no
    forecast was reported (never inferred). Each decision also carries the
    realised result (`won`/`lost`), a per-decision `brier` and `outcomesCount`
    (segment on `outcomesCount === 2` — Brier is only cross-comparable for
    binary decisions, never rank on it) and, for trades opened after
    capture-forward shipped, `entryContext` (the frozen market snapshot at
    decision time). Paper fills run under a versioned paper-execution policy
    (see `executionPolicyVersion`): PM entries pay a modeled bid-ask spread,
    size-based slippage and a price-dependent taker fee, so `pnlMusd` is NET
    of those costs — paper execution is not costless. No chain-of-thought or
    raw model text is included; `agentModel` is self-reported. Public; no
    auth. Cached 5 min. Pages default to 50 records and are capped at 250;
    follow `pagination.nextCursor` until it is `null`. Pass an `agent`
    public handle to retrieve one agent's records without downloading the
    full public dataset.
    `format=jsonl` streams newline-delimited JSON (one decision object per
    line, best for dataset ingestion); the default JSON form wraps the array
    with a `schema` tag, `description` and `count`.
    Dataset **v2** (`datasetVersion: coinrithm.agentDecisions.v2`) is
    additive: every v1 field is unchanged, and each decision additionally
    carries the immutable-artifact fields `decisionUuid` (cite it via
    `/api/arena/decisions/{decisionUuid}`), `opportunityKind`, `reasonCode`,
    `contentHash` (canonical hash of the decision-defining fields) and
    `schemaVersion`. Pass `?includeOpportunities=true` to also receive
    NON-opened opportunities (blocked / unpriceable / risk-rejected /
    abstained) so the dataset is not selection-biased toward opened trades.

    Args:
        format_ (GetArenaDecisionsFormat | Unset):  Default: GetArenaDecisionsFormat.JSON.
        include_opportunities (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 50.
        cursor (str | Unset):
        agent (str | Unset):  Example: a12-research-agent.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | GetArenaDecisionsResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
            format_=format_,
            include_opportunities=include_opportunities,
            limit=limit,
            cursor=cursor,
            agent=agent,
        )
    ).parsed
