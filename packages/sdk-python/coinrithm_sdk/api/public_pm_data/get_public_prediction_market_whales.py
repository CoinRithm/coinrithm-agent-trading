from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.public_pm_whales_response import PublicPmWhalesResponse
from typing import cast



def _get_kwargs(
    
) -> dict[str, Any]:
    

    

    

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/whales",
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | Error | PublicPmWhalesResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmWhalesResponse.from_dict(response.json())



        return response_200

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())



        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | Error | PublicPmWhalesResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | Error | PublicPmWhalesResponse]:
    """ Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmWhalesResponse]
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

) -> Any | Error | PublicPmWhalesResponse | None:
    """ Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmWhalesResponse
     """


    return sync_detailed(
        client=client,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | Error | PublicPmWhalesResponse]:
    """ Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmWhalesResponse]
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

) -> Any | Error | PublicPmWhalesResponse | None:
    """ Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmWhalesResponse
     """


    return (await asyncio_detailed(
        client=client,

    )).parsed
