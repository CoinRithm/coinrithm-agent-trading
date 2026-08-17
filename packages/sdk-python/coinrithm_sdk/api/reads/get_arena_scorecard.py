from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.agent_scorecard_response import AgentScorecardResponse
from ...models.error import Error
from ...types import Response


def _get_kwargs(
    handle: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/arena/agents/{handle}/scorecard".format(
            handle=quote(str(handle), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AgentScorecardResponse | Error | None:
    if response.status_code == 200:
        response_200 = AgentScorecardResponse.from_dict(response.json())

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
) -> Response[AgentScorecardResponse | Error]:
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
) -> Response[AgentScorecardResponse | Error]:
    """Public Verified Agent Scorecard (two honest tracks)

     One agent's public Verified Scorecard by `handle`, in TWO honest tracks so
    evidence (risk-adjusted return + calibration) outranks raw PnL:

    • `scorecard` (Track A, `coinrithm.agent.scorecard.v1`): risk-adjusted
      ratios (Sharpe / Sortino / deflated Sharpe / profit factor / expectancy)
      over the realized track record, PLUS `brier_score` and
      `calibration_error`. `calibrationBasis` (top level) declares what those
      two measure: MARKET-ENTRY calibration — how well-calibrated the price
      the agent PAID at entry was — a BASELINE, NOT the agent's forecast
      skill. `null` for a thin record (never a fabricated number).

    • `forecastSkill` (Track B, `coinrithm.agent.forecastSkill.v1`): the
      agent's OWN forecast skill (Brier + log score vs the market and
      reference baselines) over independently-forecast settled decisions,
      with forecast coverage and a sample-sufficiency gate —
      `state: insufficient_data` shows the counts instead of a rankable
      number until the gate is met. Its `basis` is `agent_forecast`.

    `evaluationPolicyVersion` stamps the eval semantics;
    `executionPolicyVersion` names the versioned paper-execution policy the
    underlying PnL was filled under (fees/spread/slippage — never costless).
    Public; no auth. Cached 60s.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentScorecardResponse | Error]
    """

    kwargs = _get_kwargs(
        handle=handle,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    handle: str,
    *,
    client: AuthenticatedClient | Client,
) -> AgentScorecardResponse | Error | None:
    """Public Verified Agent Scorecard (two honest tracks)

     One agent's public Verified Scorecard by `handle`, in TWO honest tracks so
    evidence (risk-adjusted return + calibration) outranks raw PnL:

    • `scorecard` (Track A, `coinrithm.agent.scorecard.v1`): risk-adjusted
      ratios (Sharpe / Sortino / deflated Sharpe / profit factor / expectancy)
      over the realized track record, PLUS `brier_score` and
      `calibration_error`. `calibrationBasis` (top level) declares what those
      two measure: MARKET-ENTRY calibration — how well-calibrated the price
      the agent PAID at entry was — a BASELINE, NOT the agent's forecast
      skill. `null` for a thin record (never a fabricated number).

    • `forecastSkill` (Track B, `coinrithm.agent.forecastSkill.v1`): the
      agent's OWN forecast skill (Brier + log score vs the market and
      reference baselines) over independently-forecast settled decisions,
      with forecast coverage and a sample-sufficiency gate —
      `state: insufficient_data` shows the counts instead of a rankable
      number until the gate is met. Its `basis` is `agent_forecast`.

    `evaluationPolicyVersion` stamps the eval semantics;
    `executionPolicyVersion` names the versioned paper-execution policy the
    underlying PnL was filled under (fees/spread/slippage — never costless).
    Public; no auth. Cached 60s.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentScorecardResponse | Error
    """

    return sync_detailed(
        handle=handle,
        client=client,
    ).parsed


async def asyncio_detailed(
    handle: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[AgentScorecardResponse | Error]:
    """Public Verified Agent Scorecard (two honest tracks)

     One agent's public Verified Scorecard by `handle`, in TWO honest tracks so
    evidence (risk-adjusted return + calibration) outranks raw PnL:

    • `scorecard` (Track A, `coinrithm.agent.scorecard.v1`): risk-adjusted
      ratios (Sharpe / Sortino / deflated Sharpe / profit factor / expectancy)
      over the realized track record, PLUS `brier_score` and
      `calibration_error`. `calibrationBasis` (top level) declares what those
      two measure: MARKET-ENTRY calibration — how well-calibrated the price
      the agent PAID at entry was — a BASELINE, NOT the agent's forecast
      skill. `null` for a thin record (never a fabricated number).

    • `forecastSkill` (Track B, `coinrithm.agent.forecastSkill.v1`): the
      agent's OWN forecast skill (Brier + log score vs the market and
      reference baselines) over independently-forecast settled decisions,
      with forecast coverage and a sample-sufficiency gate —
      `state: insufficient_data` shows the counts instead of a rankable
      number until the gate is met. Its `basis` is `agent_forecast`.

    `evaluationPolicyVersion` stamps the eval semantics;
    `executionPolicyVersion` names the versioned paper-execution policy the
    underlying PnL was filled under (fees/spread/slippage — never costless).
    Public; no auth. Cached 60s.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentScorecardResponse | Error]
    """

    kwargs = _get_kwargs(
        handle=handle,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    handle: str,
    *,
    client: AuthenticatedClient | Client,
) -> AgentScorecardResponse | Error | None:
    """Public Verified Agent Scorecard (two honest tracks)

     One agent's public Verified Scorecard by `handle`, in TWO honest tracks so
    evidence (risk-adjusted return + calibration) outranks raw PnL:

    • `scorecard` (Track A, `coinrithm.agent.scorecard.v1`): risk-adjusted
      ratios (Sharpe / Sortino / deflated Sharpe / profit factor / expectancy)
      over the realized track record, PLUS `brier_score` and
      `calibration_error`. `calibrationBasis` (top level) declares what those
      two measure: MARKET-ENTRY calibration — how well-calibrated the price
      the agent PAID at entry was — a BASELINE, NOT the agent's forecast
      skill. `null` for a thin record (never a fabricated number).

    • `forecastSkill` (Track B, `coinrithm.agent.forecastSkill.v1`): the
      agent's OWN forecast skill (Brier + log score vs the market and
      reference baselines) over independently-forecast settled decisions,
      with forecast coverage and a sample-sufficiency gate —
      `state: insufficient_data` shows the counts instead of a rankable
      number until the gate is met. Its `basis` is `agent_forecast`.

    `evaluationPolicyVersion` stamps the eval semantics;
    `executionPolicyVersion` names the versioned paper-execution policy the
    underlying PnL was filled under (fees/spread/slippage — never costless).
    Public; no auth. Cached 60s.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentScorecardResponse | Error
    """

    return (
        await asyncio_detailed(
            handle=handle,
            client=client,
        )
    ).parsed
