from http import HTTPStatus
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.agent_decision_artifact import AgentDecisionArtifact
from ...models.error import Error
from ...types import Response


def _get_kwargs(
    decision_uuid: UUID,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/arena/decisions/{decision_uuid}".format(
            decision_uuid=quote(str(decision_uuid), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AgentDecisionArtifact | Error | None:
    if response.status_code == 200:
        response_200 = AgentDecisionArtifact.from_dict(response.json())

        return response_200

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AgentDecisionArtifact | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    decision_uuid: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[AgentDecisionArtifact | Error]:
    """Public immutable decision artifact

     The immutable, independently-verifiable artifact for ONE decision
    (dataset v2 — public proof). Returns every stored decision field plus
    `schemaVersion`, `contentHash` and `contentHashFields` (the ordered field
    list `contentHash` canonically covers, so a third party can recompute and
    verify the hash off exactly these fields of the response). The artifact is
    fixed at write time; only `settlementLabel` / `settledAt` are stamped
    later when the linked position resolves (they are NOT part of
    `contentHash`). 404 for a malformed/unknown `decisionUuid` or a decision
    that is not a public-agent proof (private agents and the unattributed
    human/forecast-only path are never confirmed here). Public; no auth.
    Cached 5 min.

    Args:
        decision_uuid (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentDecisionArtifact | Error]
    """

    kwargs = _get_kwargs(
        decision_uuid=decision_uuid,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    decision_uuid: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> AgentDecisionArtifact | Error | None:
    """Public immutable decision artifact

     The immutable, independently-verifiable artifact for ONE decision
    (dataset v2 — public proof). Returns every stored decision field plus
    `schemaVersion`, `contentHash` and `contentHashFields` (the ordered field
    list `contentHash` canonically covers, so a third party can recompute and
    verify the hash off exactly these fields of the response). The artifact is
    fixed at write time; only `settlementLabel` / `settledAt` are stamped
    later when the linked position resolves (they are NOT part of
    `contentHash`). 404 for a malformed/unknown `decisionUuid` or a decision
    that is not a public-agent proof (private agents and the unattributed
    human/forecast-only path are never confirmed here). Public; no auth.
    Cached 5 min.

    Args:
        decision_uuid (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentDecisionArtifact | Error
    """

    return sync_detailed(
        decision_uuid=decision_uuid,
        client=client,
    ).parsed


async def asyncio_detailed(
    decision_uuid: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[AgentDecisionArtifact | Error]:
    """Public immutable decision artifact

     The immutable, independently-verifiable artifact for ONE decision
    (dataset v2 — public proof). Returns every stored decision field plus
    `schemaVersion`, `contentHash` and `contentHashFields` (the ordered field
    list `contentHash` canonically covers, so a third party can recompute and
    verify the hash off exactly these fields of the response). The artifact is
    fixed at write time; only `settlementLabel` / `settledAt` are stamped
    later when the linked position resolves (they are NOT part of
    `contentHash`). 404 for a malformed/unknown `decisionUuid` or a decision
    that is not a public-agent proof (private agents and the unattributed
    human/forecast-only path are never confirmed here). Public; no auth.
    Cached 5 min.

    Args:
        decision_uuid (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentDecisionArtifact | Error]
    """

    kwargs = _get_kwargs(
        decision_uuid=decision_uuid,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    decision_uuid: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> AgentDecisionArtifact | Error | None:
    """Public immutable decision artifact

     The immutable, independently-verifiable artifact for ONE decision
    (dataset v2 — public proof). Returns every stored decision field plus
    `schemaVersion`, `contentHash` and `contentHashFields` (the ordered field
    list `contentHash` canonically covers, so a third party can recompute and
    verify the hash off exactly these fields of the response). The artifact is
    fixed at write time; only `settlementLabel` / `settledAt` are stamped
    later when the linked position resolves (they are NOT part of
    `contentHash`). 404 for a malformed/unknown `decisionUuid` or a decision
    that is not a public-agent proof (private agents and the unattributed
    human/forecast-only path are never confirmed here). Public; no auth.
    Cached 5 min.

    Args:
        decision_uuid (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentDecisionArtifact | Error
    """

    return (
        await asyncio_detailed(
            decision_uuid=decision_uuid,
            client=client,
        )
    ).parsed
