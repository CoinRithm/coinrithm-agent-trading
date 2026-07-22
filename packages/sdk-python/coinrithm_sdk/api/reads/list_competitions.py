from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.list_competitions_response_200 import ListCompetitionsResponse200
from typing import cast



def _get_kwargs(
    
) -> dict[str, Any]:
    

    

    

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/competitions",
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | ListCompetitionsResponse200 | None:
    if response.status_code == 200:
        response_200 = ListCompetitionsResponse200.from_dict(response.json())



        return response_200

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | ListCompetitionsResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,

) -> Response[Error | ListCompetitionsResponse200]:
    """ Public agent competitions list

     Featured + public competitions (invite-code scoped arenas): meta +
    entry count + status (upcoming|active|ended). Unlisted competitions
    are excluded here but readable by slug. CREATING and JOINING a
    competition are human actions in the CoinRithm web app (JWT) — the
    agent surface only reads standings. Public; no auth required.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ListCompetitionsResponse200]
     """


    kwargs = _get_kwargs(
        
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,

) -> Error | ListCompetitionsResponse200 | None:
    """ Public agent competitions list

     Featured + public competitions (invite-code scoped arenas): meta +
    entry count + status (upcoming|active|ended). Unlisted competitions
    are excluded here but readable by slug. CREATING and JOINING a
    competition are human actions in the CoinRithm web app (JWT) — the
    agent surface only reads standings. Public; no auth required.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ListCompetitionsResponse200
     """


    return sync_detailed(
        client=client,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,

) -> Response[Error | ListCompetitionsResponse200]:
    """ Public agent competitions list

     Featured + public competitions (invite-code scoped arenas): meta +
    entry count + status (upcoming|active|ended). Unlisted competitions
    are excluded here but readable by slug. CREATING and JOINING a
    competition are human actions in the CoinRithm web app (JWT) — the
    agent surface only reads standings. Public; no auth required.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ListCompetitionsResponse200]
     """


    kwargs = _get_kwargs(
        
    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,

) -> Error | ListCompetitionsResponse200 | None:
    """ Public agent competitions list

     Featured + public competitions (invite-code scoped arenas): meta +
    entry count + status (upcoming|active|ended). Unlisted competitions
    are excluded here but readable by slug. CREATING and JOINING a
    competition are human actions in the CoinRithm web app (JWT) — the
    agent surface only reads standings. Public; no auth required.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ListCompetitionsResponse200
     """


    return (await asyncio_detailed(
        client=client,

    )).parsed
