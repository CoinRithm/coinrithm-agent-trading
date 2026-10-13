from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.pm_paper_v2_close_request import PmPaperV2CloseRequest
from ...models.pm_paper_v2_close_result import PmPaperV2CloseResult
from ...models.pm_paper_v2_failure import PmPaperV2Failure
from ...types import Response


def _get_kwargs(
    *,
    body: PmPaperV2CloseRequest,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/pm/v2/close",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure | None:
    if response.status_code == 200:
        response_200 = PmPaperV2CloseResult.from_dict(response.json())

        return response_200

    if response.status_code == 202:
        response_202 = PmPaperV2CloseResult.from_dict(response.json())

        return response_202

    if response.status_code == 400:

        def _parse_response_400(data: object) -> Error | PmPaperV2CloseResult:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                response_400_type_0 = Error.from_dict(data)

                return response_400_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            response_400_type_1 = PmPaperV2CloseResult.from_dict(data)

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
        response_404 = PmPaperV2CloseResult.from_dict(response.json())

        return response_404

    if response.status_code == 409:
        response_409 = PmPaperV2CloseResult.from_dict(response.json())

        return response_409

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
) -> Response[Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmPaperV2CloseRequest,
) -> Response[Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure]:
    """Request a full close of a pm_paper_v2 position

     Records a durable request to close the WHOLE position (no partial
    close). The sale itself runs later on a server-side worker: it
    settles at the venue's proven final payout if the market has
    resolved, otherwise sells the exact held token against a freshly
    acquired book. A new request therefore returns 202 (`accepted:
    true`, `executed: false`); poll /api/agent/pm/v2/positions for
    `exit` and `terminal`. Only positions owned by the calling key are
    visible (others return 404). Entry flags and house enrollment do not
    block a close.

    `idempotencyKey` is global: the same key and body returns the
    existing intent (`replayed: true`, 200 once filled); a different
    body returns 409 `conflict`. If an exit intent is already active for
    the position, the new request attaches to it. Requires scope
    `trade:pm` and counts against the trade-write limit.

    Args:
        body (PmPaperV2CloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure]
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
    body: PmPaperV2CloseRequest,
) -> Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure | None:
    """Request a full close of a pm_paper_v2 position

     Records a durable request to close the WHOLE position (no partial
    close). The sale itself runs later on a server-side worker: it
    settles at the venue's proven final payout if the market has
    resolved, otherwise sells the exact held token against a freshly
    acquired book. A new request therefore returns 202 (`accepted:
    true`, `executed: false`); poll /api/agent/pm/v2/positions for
    `exit` and `terminal`. Only positions owned by the calling key are
    visible (others return 404). Entry flags and house enrollment do not
    block a close.

    `idempotencyKey` is global: the same key and body returns the
    existing intent (`replayed: true`, 200 once filled); a different
    body returns 409 `conflict`. If an exit intent is already active for
    the position, the new request attaches to it. Requires scope
    `trade:pm` and counts against the trade-write limit.

    Args:
        body (PmPaperV2CloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: PmPaperV2CloseRequest,
) -> Response[Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure]:
    """Request a full close of a pm_paper_v2 position

     Records a durable request to close the WHOLE position (no partial
    close). The sale itself runs later on a server-side worker: it
    settles at the venue's proven final payout if the market has
    resolved, otherwise sells the exact held token against a freshly
    acquired book. A new request therefore returns 202 (`accepted:
    true`, `executed: false`); poll /api/agent/pm/v2/positions for
    `exit` and `terminal`. Only positions owned by the calling key are
    visible (others return 404). Entry flags and house enrollment do not
    block a close.

    `idempotencyKey` is global: the same key and body returns the
    existing intent (`replayed: true`, 200 once filled); a different
    body returns 409 `conflict`. If an exit intent is already active for
    the position, the new request attaches to it. Requires scope
    `trade:pm` and counts against the trade-write limit.

    Args:
        body (PmPaperV2CloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: PmPaperV2CloseRequest,
) -> Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure | None:
    """Request a full close of a pm_paper_v2 position

     Records a durable request to close the WHOLE position (no partial
    close). The sale itself runs later on a server-side worker: it
    settles at the venue's proven final payout if the market has
    resolved, otherwise sells the exact held token against a freshly
    acquired book. A new request therefore returns 202 (`accepted:
    true`, `executed: false`); poll /api/agent/pm/v2/positions for
    `exit` and `terminal`. Only positions owned by the calling key are
    visible (others return 404). Entry flags and house enrollment do not
    block a close.

    `idempotencyKey` is global: the same key and body returns the
    existing intent (`replayed: true`, 200 once filled); a different
    body returns 409 `conflict`. If an exit intent is already active for
    the position, the new request attaches to it. Requires scope
    `trade:pm` and counts against the trade-write limit.

    Args:
        body (PmPaperV2CloseRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Error | PmPaperV2CloseResult | PmPaperV2CloseResult | PmPaperV2Failure
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
