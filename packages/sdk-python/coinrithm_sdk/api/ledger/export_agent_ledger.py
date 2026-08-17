import datetime
from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.agent_ledger_export import AgentLedgerExport
from ...models.error import Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    venue: str | Unset = UNSET,
    event_type: str | Unset = UNSET,
    run_id: str | Unset = UNSET,
    decision_id: str | Unset = UNSET,
    status: str | Unset = UNSET,
    from_: datetime.datetime | Unset = UNSET,
    to: datetime.datetime | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["venue"] = venue

    params["eventType"] = event_type

    params["runId"] = run_id

    params["decisionId"] = decision_id

    params["status"] = status

    json_from_: str | Unset = UNSET
    if not isinstance(from_, Unset):
        json_from_ = from_.isoformat()
    params["from"] = json_from_

    json_to: str | Unset = UNSET
    if not isinstance(to, Unset):
        json_to = to.isoformat()
    params["to"] = json_to

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/ledger/export",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AgentLedgerExport | Error | None:
    if response.status_code == 200:
        response_200 = AgentLedgerExport.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AgentLedgerExport | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    venue: str | Unset = UNSET,
    event_type: str | Unset = UNSET,
    run_id: str | Unset = UNSET,
    decision_id: str | Unset = UNSET,
    status: str | Unset = UNSET,
    from_: datetime.datetime | Unset = UNSET,
    to: datetime.datetime | Unset = UNSET,
) -> Response[AgentLedgerExport | Error]:
    """Export private action ledger rows for reproducible runs

     JSON export of up to 1,000 private ledger rows for the calling API key.
    Use `runId` / `decisionId` filters to export one reproducible agent run.
    Requires scope `read`.

    Args:
        venue (str | Unset):
        event_type (str | Unset):
        run_id (str | Unset):
        decision_id (str | Unset):
        status (str | Unset):
        from_ (datetime.datetime | Unset):
        to (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentLedgerExport | Error]
    """

    kwargs = _get_kwargs(
        venue=venue,
        event_type=event_type,
        run_id=run_id,
        decision_id=decision_id,
        status=status,
        from_=from_,
        to=to,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    venue: str | Unset = UNSET,
    event_type: str | Unset = UNSET,
    run_id: str | Unset = UNSET,
    decision_id: str | Unset = UNSET,
    status: str | Unset = UNSET,
    from_: datetime.datetime | Unset = UNSET,
    to: datetime.datetime | Unset = UNSET,
) -> AgentLedgerExport | Error | None:
    """Export private action ledger rows for reproducible runs

     JSON export of up to 1,000 private ledger rows for the calling API key.
    Use `runId` / `decisionId` filters to export one reproducible agent run.
    Requires scope `read`.

    Args:
        venue (str | Unset):
        event_type (str | Unset):
        run_id (str | Unset):
        decision_id (str | Unset):
        status (str | Unset):
        from_ (datetime.datetime | Unset):
        to (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentLedgerExport | Error
    """

    return sync_detailed(
        client=client,
        venue=venue,
        event_type=event_type,
        run_id=run_id,
        decision_id=decision_id,
        status=status,
        from_=from_,
        to=to,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    venue: str | Unset = UNSET,
    event_type: str | Unset = UNSET,
    run_id: str | Unset = UNSET,
    decision_id: str | Unset = UNSET,
    status: str | Unset = UNSET,
    from_: datetime.datetime | Unset = UNSET,
    to: datetime.datetime | Unset = UNSET,
) -> Response[AgentLedgerExport | Error]:
    """Export private action ledger rows for reproducible runs

     JSON export of up to 1,000 private ledger rows for the calling API key.
    Use `runId` / `decisionId` filters to export one reproducible agent run.
    Requires scope `read`.

    Args:
        venue (str | Unset):
        event_type (str | Unset):
        run_id (str | Unset):
        decision_id (str | Unset):
        status (str | Unset):
        from_ (datetime.datetime | Unset):
        to (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentLedgerExport | Error]
    """

    kwargs = _get_kwargs(
        venue=venue,
        event_type=event_type,
        run_id=run_id,
        decision_id=decision_id,
        status=status,
        from_=from_,
        to=to,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    venue: str | Unset = UNSET,
    event_type: str | Unset = UNSET,
    run_id: str | Unset = UNSET,
    decision_id: str | Unset = UNSET,
    status: str | Unset = UNSET,
    from_: datetime.datetime | Unset = UNSET,
    to: datetime.datetime | Unset = UNSET,
) -> AgentLedgerExport | Error | None:
    """Export private action ledger rows for reproducible runs

     JSON export of up to 1,000 private ledger rows for the calling API key.
    Use `runId` / `decisionId` filters to export one reproducible agent run.
    Requires scope `read`.

    Args:
        venue (str | Unset):
        event_type (str | Unset):
        run_id (str | Unset):
        decision_id (str | Unset):
        status (str | Unset):
        from_ (datetime.datetime | Unset):
        to (datetime.datetime | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentLedgerExport | Error
    """

    return (
        await asyncio_detailed(
            client=client,
            venue=venue,
            event_type=event_type,
            run_id=run_id,
            decision_id=decision_id,
            status=status,
            from_=from_,
            to=to,
        )
    ).parsed
