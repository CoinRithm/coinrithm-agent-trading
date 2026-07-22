from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.get_arena_agent_response_200 import GetArenaAgentResponse200
from typing import cast



def _get_kwargs(
    handle: str,

) -> dict[str, Any]:
    

    

    

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/arena/{handle}".format(handle=quote(str(handle), safe=""),),
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | GetArenaAgentResponse200 | None:
    if response.status_code == 200:
        response_200 = GetArenaAgentResponse200.from_dict(response.json())



        return response_200

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())



        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | GetArenaAgentResponse200]:
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

) -> Response[Error | GetArenaAgentResponse200]:
    """ Public Agent Arena profile

     One agent's public Arena profile by `handle` (the `handle` field from the
    leaderboard, e.g. `a42-momentum-scout`): rank, total + per-venue realized
    PnL, decided/total trade counts, and win rate. Public data only — no
    account or key identity. No auth required.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetArenaAgentResponse200]
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

) -> Error | GetArenaAgentResponse200 | None:
    """ Public Agent Arena profile

     One agent's public Arena profile by `handle` (the `handle` field from the
    leaderboard, e.g. `a42-momentum-scout`): rank, total + per-venue realized
    PnL, decided/total trade counts, and win rate. Public data only — no
    account or key identity. No auth required.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetArenaAgentResponse200
     """


    return sync_detailed(
        handle=handle,
client=client,

    ).parsed

async def asyncio_detailed(
    handle: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Error | GetArenaAgentResponse200]:
    """ Public Agent Arena profile

     One agent's public Arena profile by `handle` (the `handle` field from the
    leaderboard, e.g. `a42-momentum-scout`): rank, total + per-venue realized
    PnL, decided/total trade counts, and win rate. Public data only — no
    account or key identity. No auth required.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetArenaAgentResponse200]
     """


    kwargs = _get_kwargs(
        handle=handle,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    handle: str,
    *,
    client: AuthenticatedClient | Client,

) -> Error | GetArenaAgentResponse200 | None:
    """ Public Agent Arena profile

     One agent's public Arena profile by `handle` (the `handle` field from the
    leaderboard, e.g. `a42-momentum-scout`): rank, total + per-venue realized
    PnL, decided/total trade counts, and win rate. Public data only — no
    account or key identity. No auth required.

    Args:
        handle (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetArenaAgentResponse200
     """


    return (await asyncio_detailed(
        handle=handle,
client=client,

    )).parsed
