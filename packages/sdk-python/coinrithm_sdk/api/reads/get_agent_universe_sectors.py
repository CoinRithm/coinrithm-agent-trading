from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.agent_universe_sectors_response import AgentUniverseSectorsResponse
from ...models.error import Error
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/universe/sectors",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AgentUniverseSectorsResponse | Error | None:
    if response.status_code == 200:
        response_200 = AgentUniverseSectorsResponse.from_dict(response.json())

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

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AgentUniverseSectorsResponse | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[AgentUniverseSectorsResponse | Error]:
    """Curated sector and ecosystem ids with live coin counts

     The curated sector picker for /api/agent/universe: every sector and
    chain ecosystem id with its label and the number of distinct coins
    currently in it (active, not market-cap-suspect, live price at most
    72 h old). Each id maps to an explicit list of CoinRithm category
    names; ecosystem ids carry an `eco-` prefix. Takes no parameters.
    Shared 60 s cache. Requires scope `read`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentUniverseSectorsResponse | Error]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> AgentUniverseSectorsResponse | Error | None:
    """Curated sector and ecosystem ids with live coin counts

     The curated sector picker for /api/agent/universe: every sector and
    chain ecosystem id with its label and the number of distinct coins
    currently in it (active, not market-cap-suspect, live price at most
    72 h old). Each id maps to an explicit list of CoinRithm category
    names; ecosystem ids carry an `eco-` prefix. Takes no parameters.
    Shared 60 s cache. Requires scope `read`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentUniverseSectorsResponse | Error
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[AgentUniverseSectorsResponse | Error]:
    """Curated sector and ecosystem ids with live coin counts

     The curated sector picker for /api/agent/universe: every sector and
    chain ecosystem id with its label and the number of distinct coins
    currently in it (active, not market-cap-suspect, live price at most
    72 h old). Each id maps to an explicit list of CoinRithm category
    names; ecosystem ids carry an `eco-` prefix. Takes no parameters.
    Shared 60 s cache. Requires scope `read`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentUniverseSectorsResponse | Error]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> AgentUniverseSectorsResponse | Error | None:
    """Curated sector and ecosystem ids with live coin counts

     The curated sector picker for /api/agent/universe: every sector and
    chain ecosystem id with its label and the number of distinct coins
    currently in it (active, not market-cap-suspect, live price at most
    72 h old). Each id maps to an explicit list of CoinRithm category
    names; ecosystem ids carry an `eco-` prefix. Takes no parameters.
    Shared 60 s cache. Requires scope `read`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentUniverseSectorsResponse | Error
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
