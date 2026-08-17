from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/stream",
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | str | None:
    if response.status_code == 200:
        response_200 = response.text
        return response_200

    if response.status_code == 503:
        response_503 = cast(Any, None)
        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | str]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | str]:
    """Live SSE stream of price deltas, whale prints and resolutions

     Keyless Server-Sent Events stream. One connection delivers three named
    event types, each a JSON payload:

    - `deltas` — top snapshot price-deltas since the previous tick
      (`{at, deltas:[{source, slug, title, priceChange24h, volume24h,
      capturedAt}]}`)
    - `whale` — newly observed verified large trades (same trade shape as
      `/api/prediction-markets/whales`; `{at, trades:[...]}`)
    - `resolution` — freshly resolved events (`{at, resolutions:[{source,
      slug, title, resolutionState, resolvedAt}]}`)

    Comment heartbeats (`: hb <iso>`) arrive roughly every 15 seconds —
    treat a silence much longer than that as a dead connection and
    reconnect (a `retry: 5000` hint is sent on connect). Feeds tick at a
    15-second cadence; a row is delivered at most once per server poller
    session. This is an information feed, not a recommendation stream.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | str]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> Any | str | None:
    """Live SSE stream of price deltas, whale prints and resolutions

     Keyless Server-Sent Events stream. One connection delivers three named
    event types, each a JSON payload:

    - `deltas` — top snapshot price-deltas since the previous tick
      (`{at, deltas:[{source, slug, title, priceChange24h, volume24h,
      capturedAt}]}`)
    - `whale` — newly observed verified large trades (same trade shape as
      `/api/prediction-markets/whales`; `{at, trades:[...]}`)
    - `resolution` — freshly resolved events (`{at, resolutions:[{source,
      slug, title, resolutionState, resolvedAt}]}`)

    Comment heartbeats (`: hb <iso>`) arrive roughly every 15 seconds —
    treat a silence much longer than that as a dead connection and
    reconnect (a `retry: 5000` hint is sent on connect). Feeds tick at a
    15-second cadence; a row is delivered at most once per server poller
    session. This is an information feed, not a recommendation stream.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | str
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | str]:
    """Live SSE stream of price deltas, whale prints and resolutions

     Keyless Server-Sent Events stream. One connection delivers three named
    event types, each a JSON payload:

    - `deltas` — top snapshot price-deltas since the previous tick
      (`{at, deltas:[{source, slug, title, priceChange24h, volume24h,
      capturedAt}]}`)
    - `whale` — newly observed verified large trades (same trade shape as
      `/api/prediction-markets/whales`; `{at, trades:[...]}`)
    - `resolution` — freshly resolved events (`{at, resolutions:[{source,
      slug, title, resolutionState, resolvedAt}]}`)

    Comment heartbeats (`: hb <iso>`) arrive roughly every 15 seconds —
    treat a silence much longer than that as a dead connection and
    reconnect (a `retry: 5000` hint is sent on connect). Feeds tick at a
    15-second cadence; a row is delivered at most once per server poller
    session. This is an information feed, not a recommendation stream.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | str]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> Any | str | None:
    """Live SSE stream of price deltas, whale prints and resolutions

     Keyless Server-Sent Events stream. One connection delivers three named
    event types, each a JSON payload:

    - `deltas` — top snapshot price-deltas since the previous tick
      (`{at, deltas:[{source, slug, title, priceChange24h, volume24h,
      capturedAt}]}`)
    - `whale` — newly observed verified large trades (same trade shape as
      `/api/prediction-markets/whales`; `{at, trades:[...]}`)
    - `resolution` — freshly resolved events (`{at, resolutions:[{source,
      slug, title, resolutionState, resolvedAt}]}`)

    Comment heartbeats (`: hb <iso>`) arrive roughly every 15 seconds —
    treat a silence much longer than that as a dead connection and
    reconnect (a `retry: 5000` hint is sent on connect). Feeds tick at a
    15-second cadence; a row is delivered at most once per server poller
    session. This is an information feed, not a recommendation stream.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | str
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
