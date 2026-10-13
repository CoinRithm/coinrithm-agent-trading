from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.pm_paper_v2_failure import PmPaperV2Failure
from ...models.pm_paper_v2_open_replay_request import PmPaperV2OpenReplayRequest
from ...models.pm_paper_v2_opened import PmPaperV2Opened
from ...models.pm_paper_v2_refused import PmPaperV2Refused
from ...types import Response


def _get_kwargs(
    *,
    body: PmPaperV2OpenReplayRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/pm/v2/open/replay",
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

    if response.status_code == 404:
        response_404 = PmPaperV2Refused.from_dict(response.json())

        return response_404

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
    body: PmPaperV2OpenReplayRequest,
) -> Response[Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused]:
    r"""Replay a pm_paper_v2 open by idempotency key without opening anything

     Read-only recovery for a lost or timed-out open. Send the IDENTICAL
    body of the original open (the canonical request is compared,
    including `forecastProbability`). Never acquires a book or opens a
    position. Returns 200 with the original position when the receipt
    exists and matches, 404 with `replayMissing: true` when no position
    holds this key (the original open did not commit; a new open with
    the same key is safe), and 409 `idempotency_conflict` when the key
    belongs to a different request or caller. `forecastProbability` is
    not required here. Requires scope `trade:pm` and counts against the
    trade-write limit.

    Args:
        body (PmPaperV2OpenReplayRequest): Any field not listed here (e.g. `stakeMusd`,
            `agentTrace`,
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
    body: PmPaperV2OpenReplayRequest,
) -> Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused | None:
    r"""Replay a pm_paper_v2 open by idempotency key without opening anything

     Read-only recovery for a lost or timed-out open. Send the IDENTICAL
    body of the original open (the canonical request is compared,
    including `forecastProbability`). Never acquires a book or opens a
    position. Returns 200 with the original position when the receipt
    exists and matches, 404 with `replayMissing: true` when no position
    holds this key (the original open did not commit; a new open with
    the same key is safe), and 409 `idempotency_conflict` when the key
    belongs to a different request or caller. `forecastProbability` is
    not required here. Requires scope `trade:pm` and counts against the
    trade-write limit.

    Args:
        body (PmPaperV2OpenReplayRequest): Any field not listed here (e.g. `stakeMusd`,
            `agentTrace`,
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
    body: PmPaperV2OpenReplayRequest,
) -> Response[Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused]:
    r"""Replay a pm_paper_v2 open by idempotency key without opening anything

     Read-only recovery for a lost or timed-out open. Send the IDENTICAL
    body of the original open (the canonical request is compared,
    including `forecastProbability`). Never acquires a book or opens a
    position. Returns 200 with the original position when the receipt
    exists and matches, 404 with `replayMissing: true` when no position
    holds this key (the original open did not commit; a new open with
    the same key is safe), and 409 `idempotency_conflict` when the key
    belongs to a different request or caller. `forecastProbability` is
    not required here. Requires scope `trade:pm` and counts against the
    trade-write limit.

    Args:
        body (PmPaperV2OpenReplayRequest): Any field not listed here (e.g. `stakeMusd`,
            `agentTrace`,
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
    body: PmPaperV2OpenReplayRequest,
) -> Error | Error | PmPaperV2Failure | PmPaperV2Failure | PmPaperV2Opened | PmPaperV2Refused | None:
    r"""Replay a pm_paper_v2 open by idempotency key without opening anything

     Read-only recovery for a lost or timed-out open. Send the IDENTICAL
    body of the original open (the canonical request is compared,
    including `forecastProbability`). Never acquires a book or opens a
    position. Returns 200 with the original position when the receipt
    exists and matches, 404 with `replayMissing: true` when no position
    holds this key (the original open did not commit; a new open with
    the same key is safe), and 409 `idempotency_conflict` when the key
    belongs to a different request or caller. `forecastProbability` is
    not required here. Requires scope `trade:pm` and counts against the
    trade-write limit.

    Args:
        body (PmPaperV2OpenReplayRequest): Any field not listed here (e.g. `stakeMusd`,
            `agentTrace`,
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
