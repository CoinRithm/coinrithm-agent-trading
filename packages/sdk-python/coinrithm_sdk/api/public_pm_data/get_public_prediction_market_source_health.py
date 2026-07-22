from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.public_pm_sources_health_response import PublicPmSourcesHealthResponse
from typing import cast



def _get_kwargs(
    
) -> dict[str, Any]:
    

    

    

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/sources/health",
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | Error | PublicPmSourcesHealthResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmSourcesHealthResponse.from_dict(response.json())



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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | Error | PublicPmSourcesHealthResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | Error | PublicPmSourcesHealthResponse]:
    """ Source freshness and catalog-completeness truth

     Keyless per-venue ingest evidence. Freshness and catalog completeness
    are separate: a venue can have a fresh hot set while its full catalog
    sweep is provider-bounded. Agents should skip stale or unhealthy sources
    and preserve the returned completeness disclosure when citing coverage.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmSourcesHealthResponse]
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

) -> Any | Error | PublicPmSourcesHealthResponse | None:
    """ Source freshness and catalog-completeness truth

     Keyless per-venue ingest evidence. Freshness and catalog completeness
    are separate: a venue can have a fresh hot set while its full catalog
    sweep is provider-bounded. Agents should skip stale or unhealthy sources
    and preserve the returned completeness disclosure when citing coverage.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmSourcesHealthResponse
     """


    return sync_detailed(
        client=client,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | Error | PublicPmSourcesHealthResponse]:
    """ Source freshness and catalog-completeness truth

     Keyless per-venue ingest evidence. Freshness and catalog completeness
    are separate: a venue can have a fresh hot set while its full catalog
    sweep is provider-bounded. Agents should skip stale or unhealthy sources
    and preserve the returned completeness disclosure when citing coverage.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmSourcesHealthResponse]
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

) -> Any | Error | PublicPmSourcesHealthResponse | None:
    """ Source freshness and catalog-completeness truth

     Keyless per-venue ingest evidence. Freshness and catalog completeness
    are separate: a venue can have a fresh hot set while its full catalog
    sweep is provider-bounded. Agents should skip stale or unhealthy sources
    and preserve the returned completeness disclosure when citing coverage.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmSourcesHealthResponse
     """


    return (await asyncio_detailed(
        client=client,

    )).parsed
