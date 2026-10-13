from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_pm_paper_v2_positions_response_503 import GetPmPaperV2PositionsResponse503
from ...models.get_pm_paper_v2_positions_status import GetPmPaperV2PositionsStatus
from ...models.pm_paper_v2_positions_response import PmPaperV2PositionsResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 25,
    before_id: int | Unset = UNSET,
    status: GetPmPaperV2PositionsStatus | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["beforeId"] = before_id

    json_status: str | Unset = UNSET
    if not isinstance(status, Unset):
        json_status = status.value

    params["status"] = json_status

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/pm/v2/positions",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse | None:
    if response.status_code == 200:
        response_200 = PmPaperV2PositionsResponse.from_dict(response.json())

        return response_200

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

    if response.status_code == 503:
        response_503 = GetPmPaperV2PositionsResponse503.from_dict(response.json())

        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before_id: int | Unset = UNSET,
    status: GetPmPaperV2PositionsStatus | Unset = UNSET,
) -> Response[Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse]:
    """List this key's pm_paper_v2 positions with exact accounting

     Newest-first page of the calling key's `pm_paper_v2` positions (v1
    positions stay on /api/agent/positions/pm), plus an unpaginated risk
    summary, the key's house enrollment and whether entry is enabled.
    Money and quantity are exact integer strings: `*Quanta6` values are
    paper mUSD x 1,000,000 and `quantityUnits2` is shares x 100. Payout,
    PnL and `terminal` stay null until the close or settlement is fully
    recorded (`accountingStatus: settled`). Any key with scope `read` may
    call it; a key that never opened a v2 position gets an empty page.
    Responses carry `Cache-Control: private, no-store`.

    Args:
        limit (int | Unset):  Default: 25.
        before_id (int | Unset):
        status (GetPmPaperV2PositionsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        before_id=before_id,
        status=status,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before_id: int | Unset = UNSET,
    status: GetPmPaperV2PositionsStatus | Unset = UNSET,
) -> Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse | None:
    """List this key's pm_paper_v2 positions with exact accounting

     Newest-first page of the calling key's `pm_paper_v2` positions (v1
    positions stay on /api/agent/positions/pm), plus an unpaginated risk
    summary, the key's house enrollment and whether entry is enabled.
    Money and quantity are exact integer strings: `*Quanta6` values are
    paper mUSD x 1,000,000 and `quantityUnits2` is shares x 100. Payout,
    PnL and `terminal` stay null until the close or settlement is fully
    recorded (`accountingStatus: settled`). Any key with scope `read` may
    call it; a key that never opened a v2 position gets an empty page.
    Responses carry `Cache-Control: private, no-store`.

    Args:
        limit (int | Unset):  Default: 25.
        before_id (int | Unset):
        status (GetPmPaperV2PositionsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        before_id=before_id,
        status=status,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before_id: int | Unset = UNSET,
    status: GetPmPaperV2PositionsStatus | Unset = UNSET,
) -> Response[Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse]:
    """List this key's pm_paper_v2 positions with exact accounting

     Newest-first page of the calling key's `pm_paper_v2` positions (v1
    positions stay on /api/agent/positions/pm), plus an unpaginated risk
    summary, the key's house enrollment and whether entry is enabled.
    Money and quantity are exact integer strings: `*Quanta6` values are
    paper mUSD x 1,000,000 and `quantityUnits2` is shares x 100. Payout,
    PnL and `terminal` stay null until the close or settlement is fully
    recorded (`accountingStatus: settled`). Any key with scope `read` may
    call it; a key that never opened a v2 position gets an empty page.
    Responses carry `Cache-Control: private, no-store`.

    Args:
        limit (int | Unset):  Default: 25.
        before_id (int | Unset):
        status (GetPmPaperV2PositionsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        before_id=before_id,
        status=status,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 25,
    before_id: int | Unset = UNSET,
    status: GetPmPaperV2PositionsStatus | Unset = UNSET,
) -> Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse | None:
    """List this key's pm_paper_v2 positions with exact accounting

     Newest-first page of the calling key's `pm_paper_v2` positions (v1
    positions stay on /api/agent/positions/pm), plus an unpaginated risk
    summary, the key's house enrollment and whether entry is enabled.
    Money and quantity are exact integer strings: `*Quanta6` values are
    paper mUSD x 1,000,000 and `quantityUnits2` is shares x 100. Payout,
    PnL and `terminal` stay null until the close or settlement is fully
    recorded (`accountingStatus: settled`). Any key with scope `read` may
    call it; a key that never opened a v2 position gets an empty page.
    Responses carry `Cache-Control: private, no-store`.

    Args:
        limit (int | Unset):  Default: 25.
        before_id (int | Unset):
        status (GetPmPaperV2PositionsStatus | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetPmPaperV2PositionsResponse503 | PmPaperV2PositionsResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            before_id=before_id,
            status=status,
        )
    ).parsed
