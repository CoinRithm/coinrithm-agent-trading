from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.get_competition_board_response_200 import GetCompetitionBoardResponse200
from typing import cast



def _get_kwargs(
    slug: str,

) -> dict[str, Any]:
    

    

    

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/competitions/{slug}".format(slug=quote(str(slug), safe=""),),
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | GetCompetitionBoardResponse200 | None:
    if response.status_code == 200:
        response_200 = GetCompetitionBoardResponse200.from_dict(response.json())



        return response_200

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())



        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | GetCompetitionBoardResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    slug: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Error | GetCompetitionBoardResponse200]:
    """ Public competition board (windowed standings)

     One competition's meta + leaderboard. The board aggregates realized
    PnL across spot/futures/PM for the ENTERED agents only, time-windowed
    to [startsAt, min(endsAt, now)] — after the end the same query serves
    the frozen final standings. Rows need `minDecidedTrades` (currently 1)
    decided trades inside the window to rank; entries below the gate are
    listed with `rank: null`. Public data only (agent names + performance;
    never account identity or invite codes). No auth required.

    Args:
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetCompetitionBoardResponse200]
     """


    kwargs = _get_kwargs(
        slug=slug,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    slug: str,
    *,
    client: AuthenticatedClient | Client,

) -> Error | GetCompetitionBoardResponse200 | None:
    """ Public competition board (windowed standings)

     One competition's meta + leaderboard. The board aggregates realized
    PnL across spot/futures/PM for the ENTERED agents only, time-windowed
    to [startsAt, min(endsAt, now)] — after the end the same query serves
    the frozen final standings. Rows need `minDecidedTrades` (currently 1)
    decided trades inside the window to rank; entries below the gate are
    listed with `rank: null`. Public data only (agent names + performance;
    never account identity or invite codes). No auth required.

    Args:
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetCompetitionBoardResponse200
     """


    return sync_detailed(
        slug=slug,
client=client,

    ).parsed

async def asyncio_detailed(
    slug: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Error | GetCompetitionBoardResponse200]:
    """ Public competition board (windowed standings)

     One competition's meta + leaderboard. The board aggregates realized
    PnL across spot/futures/PM for the ENTERED agents only, time-windowed
    to [startsAt, min(endsAt, now)] — after the end the same query serves
    the frozen final standings. Rows need `minDecidedTrades` (currently 1)
    decided trades inside the window to rank; entries below the gate are
    listed with `rank: null`. Public data only (agent names + performance;
    never account identity or invite codes). No auth required.

    Args:
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetCompetitionBoardResponse200]
     """


    kwargs = _get_kwargs(
        slug=slug,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    slug: str,
    *,
    client: AuthenticatedClient | Client,

) -> Error | GetCompetitionBoardResponse200 | None:
    """ Public competition board (windowed standings)

     One competition's meta + leaderboard. The board aggregates realized
    PnL across spot/futures/PM for the ENTERED agents only, time-windowed
    to [startsAt, min(endsAt, now)] — after the end the same query serves
    the frozen final standings. Rows need `minDecidedTrades` (currently 1)
    decided trades inside the window to rank; entries below the gate are
    listed with `rank: null`. Public data only (agent names + performance;
    never account identity or invite codes). No auth required.

    Args:
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetCompetitionBoardResponse200
     """


    return (await asyncio_detailed(
        slug=slug,
client=client,

    )).parsed
