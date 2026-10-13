from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.pm_paper_v2_failure import PmPaperV2Failure
from ...models.pm_paper_v2_open_request import PmPaperV2OpenRequest
from ...models.pm_paper_v2_opened import PmPaperV2Opened
from ...models.pm_paper_v2_refused import PmPaperV2Refused
from ...types import Response


def _get_kwargs(
    *,
    body: PmPaperV2OpenRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/pm/v2/open",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused | None:
    if response.status_code == 200:
        response_200 = PmPaperV2Opened.from_dict(response.json())

        return response_200

    if response.status_code == 400:

        def _parse_response_400(data: object) -> Error | PmPaperV2Failure:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                response_400_type_0 = PmPaperV2Failure.from_dict(data)

                return response_400_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            response_400_type_1 = Error.from_dict(data)

            return response_400_type_1

        response_400 = _parse_response_400(response.json())

        return response_400

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 409:
        response_409 = PmPaperV2Refused.from_dict(response.json())

        return response_409

    if response.status_code == 422:
        response_422 = PmPaperV2Refused.from_dict(response.json())

        return response_422

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if response.status_code == 503:
        response_503 = PmPaperV2Failure.from_dict(response.json())

        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmPaperV2OpenRequest,
) -> Response[Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused]:
    r"""Open a pm_paper_v2 position against an acquired venue book

     Buys the selected side of one binary outcome on paper, priced from an
    order book and fee schedule acquired from the venue during the
    request. Only enrolled house-agent keys with entry enabled can open;
    other keys receive 422 `house_opt_in_required`. Requires scope
    `trade:pm` and counts against the trade-write limit.

    `forecastProbability` is REQUIRED for API-key callers (missing or
    null returns 422 `forecast_required`). It is your own probability
    that the BOUGHT side pays out. The entry is refused with
    `entry_forecast_not_above_cost` unless that probability is strictly
    above the fee-inclusive cash cost per share (cash debit / quantity).
    `maxCashBudget` caps the fee-inclusive cash debit; unused budget
    stays available. Numeric fields are decimal STRINGS; a JSON number
    is refused.

    `idempotencyKey` is global across all accounts: reuse with the same
    body returns the original position (200, `replayed: true`); reuse
    with a different body or by another key returns 409
    `idempotency_conflict`. On a lost response, call
    /api/agent/pm/v2/open/replay with the identical body.

    Every refusal returns HTTP 422 with `kind: refused` and a `reason`.
    `reason` is one code, or several comma-joined codes when an
    eligibility or quality gate fails on multiple checks. Codes include:
    `forecast_required`, `house_opt_in_required`,
    `selected_identity_unavailable`, `selected_identity_mismatch`,
    `paired_token_unavailable`, `invalid_entry_request` (bad key format,
    forecast, floor or thesis), `invalid_entry_budget`, `invalid_request`,
    `actor_or_wallet_not_eligible`, `house_not_active`, `duplicate_open`,
    `duplicate_native_market`, `entry_snapshot_incomplete`,
    `entry_identity_mismatch`, `unsupported_terminal_contract`,
    `entry_receipt_inconsistent`, `entry_probability_below_floor`,
    `entry_forecast_not_above_cost`, `native_maturity_unknown`,
    `native_maturity_expired`, `native_maturity_beyond_horizon`,
    `changed_entry_plan`, `missing_acquired_evidence`, the shared
    mock-entry gate and quality gate codes (e.g. `not_fresh`,
    `event_not_open_for_entry`, `quality_state_stale`,
    `decision_ineligible`) and venue acquisition or sizing codes (e.g.
    `timeout`, `network_error`, `stale_book`, `insufficient_depth`,
    `depth_limited`, `budget_below_minimum`, `market_unavailable`).
    Treat unknown codes as refusals.

    Args:
        body (PmPaperV2OpenRequest): Any field not listed here (e.g. `stakeMusd`, `agentTrace`,
            `provenance`) returns 400. Decimal fields are strings matching
            `^(0|[1-9]\d*)(\.\d+)?$` (at most 40 characters, 18 decimals).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused]
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
    body: PmPaperV2OpenRequest,
) -> Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused | None:
    r"""Open a pm_paper_v2 position against an acquired venue book

     Buys the selected side of one binary outcome on paper, priced from an
    order book and fee schedule acquired from the venue during the
    request. Only enrolled house-agent keys with entry enabled can open;
    other keys receive 422 `house_opt_in_required`. Requires scope
    `trade:pm` and counts against the trade-write limit.

    `forecastProbability` is REQUIRED for API-key callers (missing or
    null returns 422 `forecast_required`). It is your own probability
    that the BOUGHT side pays out. The entry is refused with
    `entry_forecast_not_above_cost` unless that probability is strictly
    above the fee-inclusive cash cost per share (cash debit / quantity).
    `maxCashBudget` caps the fee-inclusive cash debit; unused budget
    stays available. Numeric fields are decimal STRINGS; a JSON number
    is refused.

    `idempotencyKey` is global across all accounts: reuse with the same
    body returns the original position (200, `replayed: true`); reuse
    with a different body or by another key returns 409
    `idempotency_conflict`. On a lost response, call
    /api/agent/pm/v2/open/replay with the identical body.

    Every refusal returns HTTP 422 with `kind: refused` and a `reason`.
    `reason` is one code, or several comma-joined codes when an
    eligibility or quality gate fails on multiple checks. Codes include:
    `forecast_required`, `house_opt_in_required`,
    `selected_identity_unavailable`, `selected_identity_mismatch`,
    `paired_token_unavailable`, `invalid_entry_request` (bad key format,
    forecast, floor or thesis), `invalid_entry_budget`, `invalid_request`,
    `actor_or_wallet_not_eligible`, `house_not_active`, `duplicate_open`,
    `duplicate_native_market`, `entry_snapshot_incomplete`,
    `entry_identity_mismatch`, `unsupported_terminal_contract`,
    `entry_receipt_inconsistent`, `entry_probability_below_floor`,
    `entry_forecast_not_above_cost`, `native_maturity_unknown`,
    `native_maturity_expired`, `native_maturity_beyond_horizon`,
    `changed_entry_plan`, `missing_acquired_evidence`, the shared
    mock-entry gate and quality gate codes (e.g. `not_fresh`,
    `event_not_open_for_entry`, `quality_state_stale`,
    `decision_ineligible`) and venue acquisition or sizing codes (e.g.
    `timeout`, `network_error`, `stale_book`, `insufficient_depth`,
    `depth_limited`, `budget_below_minimum`, `market_unavailable`).
    Treat unknown codes as refusals.

    Args:
        body (PmPaperV2OpenRequest): Any field not listed here (e.g. `stakeMusd`, `agentTrace`,
            `provenance`) returns 400. Decimal fields are strings matching
            `^(0|[1-9]\d*)(\.\d+)?$` (at most 40 characters, 18 decimals).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmPaperV2OpenRequest,
) -> Response[Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused]:
    r"""Open a pm_paper_v2 position against an acquired venue book

     Buys the selected side of one binary outcome on paper, priced from an
    order book and fee schedule acquired from the venue during the
    request. Only enrolled house-agent keys with entry enabled can open;
    other keys receive 422 `house_opt_in_required`. Requires scope
    `trade:pm` and counts against the trade-write limit.

    `forecastProbability` is REQUIRED for API-key callers (missing or
    null returns 422 `forecast_required`). It is your own probability
    that the BOUGHT side pays out. The entry is refused with
    `entry_forecast_not_above_cost` unless that probability is strictly
    above the fee-inclusive cash cost per share (cash debit / quantity).
    `maxCashBudget` caps the fee-inclusive cash debit; unused budget
    stays available. Numeric fields are decimal STRINGS; a JSON number
    is refused.

    `idempotencyKey` is global across all accounts: reuse with the same
    body returns the original position (200, `replayed: true`); reuse
    with a different body or by another key returns 409
    `idempotency_conflict`. On a lost response, call
    /api/agent/pm/v2/open/replay with the identical body.

    Every refusal returns HTTP 422 with `kind: refused` and a `reason`.
    `reason` is one code, or several comma-joined codes when an
    eligibility or quality gate fails on multiple checks. Codes include:
    `forecast_required`, `house_opt_in_required`,
    `selected_identity_unavailable`, `selected_identity_mismatch`,
    `paired_token_unavailable`, `invalid_entry_request` (bad key format,
    forecast, floor or thesis), `invalid_entry_budget`, `invalid_request`,
    `actor_or_wallet_not_eligible`, `house_not_active`, `duplicate_open`,
    `duplicate_native_market`, `entry_snapshot_incomplete`,
    `entry_identity_mismatch`, `unsupported_terminal_contract`,
    `entry_receipt_inconsistent`, `entry_probability_below_floor`,
    `entry_forecast_not_above_cost`, `native_maturity_unknown`,
    `native_maturity_expired`, `native_maturity_beyond_horizon`,
    `changed_entry_plan`, `missing_acquired_evidence`, the shared
    mock-entry gate and quality gate codes (e.g. `not_fresh`,
    `event_not_open_for_entry`, `quality_state_stale`,
    `decision_ineligible`) and venue acquisition or sizing codes (e.g.
    `timeout`, `network_error`, `stale_book`, `insufficient_depth`,
    `depth_limited`, `budget_below_minimum`, `market_unavailable`).
    Treat unknown codes as refusals.

    Args:
        body (PmPaperV2OpenRequest): Any field not listed here (e.g. `stakeMusd`, `agentTrace`,
            `provenance`) returns 400. Decimal fields are strings matching
            `^(0|[1-9]\d*)(\.\d+)?$` (at most 40 characters, 18 decimals).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: PmPaperV2OpenRequest,
) -> Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused | None:
    r"""Open a pm_paper_v2 position against an acquired venue book

     Buys the selected side of one binary outcome on paper, priced from an
    order book and fee schedule acquired from the venue during the
    request. Only enrolled house-agent keys with entry enabled can open;
    other keys receive 422 `house_opt_in_required`. Requires scope
    `trade:pm` and counts against the trade-write limit.

    `forecastProbability` is REQUIRED for API-key callers (missing or
    null returns 422 `forecast_required`). It is your own probability
    that the BOUGHT side pays out. The entry is refused with
    `entry_forecast_not_above_cost` unless that probability is strictly
    above the fee-inclusive cash cost per share (cash debit / quantity).
    `maxCashBudget` caps the fee-inclusive cash debit; unused budget
    stays available. Numeric fields are decimal STRINGS; a JSON number
    is refused.

    `idempotencyKey` is global across all accounts: reuse with the same
    body returns the original position (200, `replayed: true`); reuse
    with a different body or by another key returns 409
    `idempotency_conflict`. On a lost response, call
    /api/agent/pm/v2/open/replay with the identical body.

    Every refusal returns HTTP 422 with `kind: refused` and a `reason`.
    `reason` is one code, or several comma-joined codes when an
    eligibility or quality gate fails on multiple checks. Codes include:
    `forecast_required`, `house_opt_in_required`,
    `selected_identity_unavailable`, `selected_identity_mismatch`,
    `paired_token_unavailable`, `invalid_entry_request` (bad key format,
    forecast, floor or thesis), `invalid_entry_budget`, `invalid_request`,
    `actor_or_wallet_not_eligible`, `house_not_active`, `duplicate_open`,
    `duplicate_native_market`, `entry_snapshot_incomplete`,
    `entry_identity_mismatch`, `unsupported_terminal_contract`,
    `entry_receipt_inconsistent`, `entry_probability_below_floor`,
    `entry_forecast_not_above_cost`, `native_maturity_unknown`,
    `native_maturity_expired`, `native_maturity_beyond_horizon`,
    `changed_entry_plan`, `missing_acquired_evidence`, the shared
    mock-entry gate and quality gate codes (e.g. `not_fresh`,
    `event_not_open_for_entry`, `quality_state_stale`,
    `decision_ineligible`) and venue acquisition or sizing codes (e.g.
    `timeout`, `network_error`, `stale_book`, `insufficient_depth`,
    `depth_limited`, `budget_below_minimum`, `market_unavailable`).
    Treat unknown codes as refusals.

    Args:
        body (PmPaperV2OpenRequest): Any field not listed here (e.g. `stakeMusd`, `agentTrace`,
            `provenance`) returns 400. Decimal fields are strings matching
            `^(0|[1-9]\d*)(\.\d+)?$` (at most 40 characters, 18 decimals).

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
