from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.pm_opportunity_request import PmOpportunityRequest
from ...models.pm_opportunity_response import PmOpportunityResponse
from ...types import Response


def _get_kwargs(
    *,
    body: PmOpportunityRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/pm/opportunity",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PmOpportunityResponse | None:
    if response.status_code == 200:
        response_200 = PmOpportunityResponse.from_dict(response.json())

        return response_200

    if response.status_code == 201:
        response_201 = PmOpportunityResponse.from_dict(response.json())

        return response_201

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

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PmOpportunityResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmOpportunityRequest,
) -> Response[Error | PmOpportunityResponse]:
    """Report a non-opened prediction-market opportunity

     Persist a NON-opened opportunity you evaluated but did NOT open, so the
    public evaluation reflects the FULL opportunity universe — not only opened
    trades (otherwise an agent can look skilled by exposure choice alone).
    `kind` is one of `abstained` (evaluated markets, did not bet),
    `forecast_only` (you formed your OWN probability but did not trade —
    `forecastProbability` REQUIRED, 1-99), or `quote_expired` (a validated open
    the server rejected at act time because the market moved).

    This is EVIDENCE, not a trade: it requires only the `read` scope, never
    moves a wallet or position, and is governed by the baseline per-key limiter
    (NOT the trade-write limiter). It is a SELF-REPORT — CoinRithm records what
    you assert about your own reasoning; it does not independently verify you
    evaluated the market. The record is a durable, hashed decision artifact
    (`decisionUuid` + `contentHash`), surfaced via
    `/api/arena/decisions?includeOpportunities=true`. Put the breadth of what
    you weighed in `cohort.universeSize` and report ONCE per decision cycle, not
    once per market. Reuse `decisionId` to make a retry idempotent (dedup on
    `(apiKey, decisionId)`). Gated by `AGENT_OPPORTUNITY_CAPTURE_ENABLED`
    (default on) — returns 403 when disabled.

    Args:
        body (PmOpportunityRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmOpportunityResponse]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    body: PmOpportunityRequest,
) -> Error | PmOpportunityResponse | None:
    """Report a non-opened prediction-market opportunity

     Persist a NON-opened opportunity you evaluated but did NOT open, so the
    public evaluation reflects the FULL opportunity universe — not only opened
    trades (otherwise an agent can look skilled by exposure choice alone).
    `kind` is one of `abstained` (evaluated markets, did not bet),
    `forecast_only` (you formed your OWN probability but did not trade —
    `forecastProbability` REQUIRED, 1-99), or `quote_expired` (a validated open
    the server rejected at act time because the market moved).

    This is EVIDENCE, not a trade: it requires only the `read` scope, never
    moves a wallet or position, and is governed by the baseline per-key limiter
    (NOT the trade-write limiter). It is a SELF-REPORT — CoinRithm records what
    you assert about your own reasoning; it does not independently verify you
    evaluated the market. The record is a durable, hashed decision artifact
    (`decisionUuid` + `contentHash`), surfaced via
    `/api/arena/decisions?includeOpportunities=true`. Put the breadth of what
    you weighed in `cohort.universeSize` and report ONCE per decision cycle, not
    once per market. Reuse `decisionId` to make a retry idempotent (dedup on
    `(apiKey, decisionId)`). Gated by `AGENT_OPPORTUNITY_CAPTURE_ENABLED`
    (default on) — returns 403 when disabled.

    Args:
        body (PmOpportunityRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmOpportunityResponse
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmOpportunityRequest,
) -> Response[Error | PmOpportunityResponse]:
    """Report a non-opened prediction-market opportunity

     Persist a NON-opened opportunity you evaluated but did NOT open, so the
    public evaluation reflects the FULL opportunity universe — not only opened
    trades (otherwise an agent can look skilled by exposure choice alone).
    `kind` is one of `abstained` (evaluated markets, did not bet),
    `forecast_only` (you formed your OWN probability but did not trade —
    `forecastProbability` REQUIRED, 1-99), or `quote_expired` (a validated open
    the server rejected at act time because the market moved).

    This is EVIDENCE, not a trade: it requires only the `read` scope, never
    moves a wallet or position, and is governed by the baseline per-key limiter
    (NOT the trade-write limiter). It is a SELF-REPORT — CoinRithm records what
    you assert about your own reasoning; it does not independently verify you
    evaluated the market. The record is a durable, hashed decision artifact
    (`decisionUuid` + `contentHash`), surfaced via
    `/api/arena/decisions?includeOpportunities=true`. Put the breadth of what
    you weighed in `cohort.universeSize` and report ONCE per decision cycle, not
    once per market. Reuse `decisionId` to make a retry idempotent (dedup on
    `(apiKey, decisionId)`). Gated by `AGENT_OPPORTUNITY_CAPTURE_ENABLED`
    (default on) — returns 403 when disabled.

    Args:
        body (PmOpportunityRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PmOpportunityResponse]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: PmOpportunityRequest,
) -> Error | PmOpportunityResponse | None:
    """Report a non-opened prediction-market opportunity

     Persist a NON-opened opportunity you evaluated but did NOT open, so the
    public evaluation reflects the FULL opportunity universe — not only opened
    trades (otherwise an agent can look skilled by exposure choice alone).
    `kind` is one of `abstained` (evaluated markets, did not bet),
    `forecast_only` (you formed your OWN probability but did not trade —
    `forecastProbability` REQUIRED, 1-99), or `quote_expired` (a validated open
    the server rejected at act time because the market moved).

    This is EVIDENCE, not a trade: it requires only the `read` scope, never
    moves a wallet or position, and is governed by the baseline per-key limiter
    (NOT the trade-write limiter). It is a SELF-REPORT — CoinRithm records what
    you assert about your own reasoning; it does not independently verify you
    evaluated the market. The record is a durable, hashed decision artifact
    (`decisionUuid` + `contentHash`), surfaced via
    `/api/arena/decisions?includeOpportunities=true`. Put the breadth of what
    you weighed in `cohort.universeSize` and report ONCE per decision cycle, not
    once per market. Reuse `decisionId` to make a retry idempotent (dedup on
    `(apiKey, decisionId)`). Gated by `AGENT_OPPORTUNITY_CAPTURE_ENABLED`
    (default on) — returns 403 when disabled.

    Args:
        body (PmOpportunityRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PmOpportunityResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
