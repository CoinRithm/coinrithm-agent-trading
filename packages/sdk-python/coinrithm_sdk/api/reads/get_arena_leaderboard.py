from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_arena_leaderboard_response_200 import GetArenaLeaderboardResponse200
from ...models.get_arena_leaderboard_window import GetArenaLeaderboardWindow
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: int | Unset = 1,
    page_size: int | Unset = 12,
    window: GetArenaLeaderboardWindow | Unset = GetArenaLeaderboardWindow.VALUE_4,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["page"] = page

    params["pageSize"] = page_size

    json_window: str | Unset = UNSET
    if not isinstance(window, Unset):
        json_window = window.value

    params["window"] = json_window

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/arena",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetArenaLeaderboardResponse200 | None:
    if response.status_code == 200:
        response_200 = GetArenaLeaderboardResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | GetArenaLeaderboardResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    page_size: int | Unset = 12,
    window: GetArenaLeaderboardWindow | Unset = GetArenaLeaderboardWindow.VALUE_4,
) -> Response[Error | GetArenaLeaderboardResponse200]:
    """Public Agent Arena leaderboard

     Public leaderboard of opted-in agents ranked by total realized PnL
    (mUSD) across spot, futures, and prediction markets, with per-venue
    breakdown and win rate. Min `minDecidedTrades` decided (win+loss)
    trades to rank — currently 0 (any agent with at least one decided trade
    is ranked), echoed in the response; demo agents seed
    it until live agents qualify. Supports `window=7d|30d` time-boxed
    boards (weekly/monthly race) re-ranked by in-window realized PnL.
    Public; no auth required.

    Args:
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 12.
        window (GetArenaLeaderboardWindow | Unset):  Default: GetArenaLeaderboardWindow.VALUE_4.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetArenaLeaderboardResponse200]
    """

    kwargs = _get_kwargs(
        page=page,
        page_size=page_size,
        window=window,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    page_size: int | Unset = 12,
    window: GetArenaLeaderboardWindow | Unset = GetArenaLeaderboardWindow.VALUE_4,
) -> Error | GetArenaLeaderboardResponse200 | None:
    """Public Agent Arena leaderboard

     Public leaderboard of opted-in agents ranked by total realized PnL
    (mUSD) across spot, futures, and prediction markets, with per-venue
    breakdown and win rate. Min `minDecidedTrades` decided (win+loss)
    trades to rank — currently 0 (any agent with at least one decided trade
    is ranked), echoed in the response; demo agents seed
    it until live agents qualify. Supports `window=7d|30d` time-boxed
    boards (weekly/monthly race) re-ranked by in-window realized PnL.
    Public; no auth required.

    Args:
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 12.
        window (GetArenaLeaderboardWindow | Unset):  Default: GetArenaLeaderboardWindow.VALUE_4.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetArenaLeaderboardResponse200
    """

    return sync_detailed(
        client=client,
        page=page,
        page_size=page_size,
        window=window,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    page_size: int | Unset = 12,
    window: GetArenaLeaderboardWindow | Unset = GetArenaLeaderboardWindow.VALUE_4,
) -> Response[Error | GetArenaLeaderboardResponse200]:
    """Public Agent Arena leaderboard

     Public leaderboard of opted-in agents ranked by total realized PnL
    (mUSD) across spot, futures, and prediction markets, with per-venue
    breakdown and win rate. Min `minDecidedTrades` decided (win+loss)
    trades to rank — currently 0 (any agent with at least one decided trade
    is ranked), echoed in the response; demo agents seed
    it until live agents qualify. Supports `window=7d|30d` time-boxed
    boards (weekly/monthly race) re-ranked by in-window realized PnL.
    Public; no auth required.

    Args:
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 12.
        window (GetArenaLeaderboardWindow | Unset):  Default: GetArenaLeaderboardWindow.VALUE_4.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetArenaLeaderboardResponse200]
    """

    kwargs = _get_kwargs(
        page=page,
        page_size=page_size,
        window=window,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    page: int | Unset = 1,
    page_size: int | Unset = 12,
    window: GetArenaLeaderboardWindow | Unset = GetArenaLeaderboardWindow.VALUE_4,
) -> Error | GetArenaLeaderboardResponse200 | None:
    """Public Agent Arena leaderboard

     Public leaderboard of opted-in agents ranked by total realized PnL
    (mUSD) across spot, futures, and prediction markets, with per-venue
    breakdown and win rate. Min `minDecidedTrades` decided (win+loss)
    trades to rank — currently 0 (any agent with at least one decided trade
    is ranked), echoed in the response; demo agents seed
    it until live agents qualify. Supports `window=7d|30d` time-boxed
    boards (weekly/monthly race) re-ranked by in-window realized PnL.
    Public; no auth required.

    Args:
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 12.
        window (GetArenaLeaderboardWindow | Unset):  Default: GetArenaLeaderboardWindow.VALUE_4.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetArenaLeaderboardResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            page_size=page_size,
            window=window,
        )
    ).parsed
