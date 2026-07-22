from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error import Error
from ...models.public_pm_event_detail_response import PublicPmEventDetailResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import UNSET, Unset
from typing import cast



def _get_kwargs(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    fiat: str | Unset = 'USD',

) -> dict[str, Any]:
    

    

    params: dict[str, Any] = {}

    params["fiat"] = fiat


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/events/{source}/{slug}".format(source=quote(str(source), safe=""),slug=quote(str(slug), safe=""),),
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | PublicPmEventDetailResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmEventDetailResponse.from_dict(response.json())



        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())



        return response_400

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())



        return response_404

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())



        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | PublicPmEventDetailResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = 'USD',

) -> Response[Error | PublicPmEventDetailResponse]:
    """ Get full event evidence and cross-venue comparisons

     Provider-rich event detail including outcomes, snapshots, resolution
    provenance, related markets/news, recent large trades, volume history
    and approved cross-source matches when available. For bounded agent
    context use the MCP `pm_data_event` tool's default summary mode.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventDetailResponse]
     """


    kwargs = _get_kwargs(
        source=source,
slug=slug,
fiat=fiat,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = 'USD',

) -> Error | PublicPmEventDetailResponse | None:
    """ Get full event evidence and cross-venue comparisons

     Provider-rich event detail including outcomes, snapshots, resolution
    provenance, related markets/news, recent large trades, volume history
    and approved cross-source matches when available. For bounded agent
    context use the MCP `pm_data_event` tool's default summary mode.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventDetailResponse
     """


    return sync_detailed(
        source=source,
slug=slug,
client=client,
fiat=fiat,

    ).parsed

async def asyncio_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = 'USD',

) -> Response[Error | PublicPmEventDetailResponse]:
    """ Get full event evidence and cross-venue comparisons

     Provider-rich event detail including outcomes, snapshots, resolution
    provenance, related markets/news, recent large trades, volume history
    and approved cross-source matches when available. For bounded agent
    context use the MCP `pm_data_event` tool's default summary mode.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventDetailResponse]
     """


    kwargs = _get_kwargs(
        source=source,
slug=slug,
fiat=fiat,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = 'USD',

) -> Error | PublicPmEventDetailResponse | None:
    """ Get full event evidence and cross-venue comparisons

     Provider-rich event detail including outcomes, snapshots, resolution
    provenance, related markets/news, recent large trades, volume history
    and approved cross-source matches when available. For bounded agent
    context use the MCP `pm_data_event` tool's default summary mode.

    Args:
        source (PublicPmSourceSlug):
        slug (str):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventDetailResponse
     """


    return (await asyncio_detailed(
        source=source,
slug=slug,
client=client,
fiat=fiat,

    )).parsed
