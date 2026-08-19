from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_crypto_mover import PublicCryptoMover
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 3,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/coins/top-gainers",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | list[PublicCryptoMover] | None:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for componentsschemas_public_crypto_mover_list_item_data in _response_200:
            componentsschemas_public_crypto_mover_list_item = PublicCryptoMover.from_dict(
                componentsschemas_public_crypto_mover_list_item_data
            )

            response_200.append(componentsschemas_public_crypto_mover_list_item)

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | list[PublicCryptoMover]]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 3,
) -> Response[Error | list[PublicCryptoMover]]:
    """Top 24h crypto gainers (universe scan)

     Keyless scan of CoinRithm's tracked coin universe for the largest 24h
    price INCREASES, ordered by 24h change percent descending. Backs the
    `get_crypto_movers` MCP tool and the agent runner's `universe_scan`
    capability: it is how an agent finds candidates OUTSIDE its configured
    watchlist.

    The response is a BARE ARRAY, not an envelope. Each row's `ucid` is the
    `coinId` every other endpoint takes (`/api/agent/market/{coinId}`,
    `/api/agent/market/{coinId}/candles`, the futures quote/open body) —
    pass it through directly. Do NOT re-derive the coin from `symbol`:
    symbols collide across listings, so a symbol lookup can return a
    different coin than the one that moved.

    `change24h` and `currentPrice` are serialized as decimal STRINGS
    (numeric columns), not JSON numbers. Values refresh on the ~60s core
    price tick.

    Args:
        limit (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | list[PublicCryptoMover]]
    """

    kwargs = _get_kwargs(
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 3,
) -> Error | list[PublicCryptoMover] | None:
    """Top 24h crypto gainers (universe scan)

     Keyless scan of CoinRithm's tracked coin universe for the largest 24h
    price INCREASES, ordered by 24h change percent descending. Backs the
    `get_crypto_movers` MCP tool and the agent runner's `universe_scan`
    capability: it is how an agent finds candidates OUTSIDE its configured
    watchlist.

    The response is a BARE ARRAY, not an envelope. Each row's `ucid` is the
    `coinId` every other endpoint takes (`/api/agent/market/{coinId}`,
    `/api/agent/market/{coinId}/candles`, the futures quote/open body) —
    pass it through directly. Do NOT re-derive the coin from `symbol`:
    symbols collide across listings, so a symbol lookup can return a
    different coin than the one that moved.

    `change24h` and `currentPrice` are serialized as decimal STRINGS
    (numeric columns), not JSON numbers. Values refresh on the ~60s core
    price tick.

    Args:
        limit (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | list[PublicCryptoMover]
    """

    return sync_detailed(
        client=client,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 3,
) -> Response[Error | list[PublicCryptoMover]]:
    """Top 24h crypto gainers (universe scan)

     Keyless scan of CoinRithm's tracked coin universe for the largest 24h
    price INCREASES, ordered by 24h change percent descending. Backs the
    `get_crypto_movers` MCP tool and the agent runner's `universe_scan`
    capability: it is how an agent finds candidates OUTSIDE its configured
    watchlist.

    The response is a BARE ARRAY, not an envelope. Each row's `ucid` is the
    `coinId` every other endpoint takes (`/api/agent/market/{coinId}`,
    `/api/agent/market/{coinId}/candles`, the futures quote/open body) —
    pass it through directly. Do NOT re-derive the coin from `symbol`:
    symbols collide across listings, so a symbol lookup can return a
    different coin than the one that moved.

    `change24h` and `currentPrice` are serialized as decimal STRINGS
    (numeric columns), not JSON numbers. Values refresh on the ~60s core
    price tick.

    Args:
        limit (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | list[PublicCryptoMover]]
    """

    kwargs = _get_kwargs(
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 3,
) -> Error | list[PublicCryptoMover] | None:
    """Top 24h crypto gainers (universe scan)

     Keyless scan of CoinRithm's tracked coin universe for the largest 24h
    price INCREASES, ordered by 24h change percent descending. Backs the
    `get_crypto_movers` MCP tool and the agent runner's `universe_scan`
    capability: it is how an agent finds candidates OUTSIDE its configured
    watchlist.

    The response is a BARE ARRAY, not an envelope. Each row's `ucid` is the
    `coinId` every other endpoint takes (`/api/agent/market/{coinId}`,
    `/api/agent/market/{coinId}/candles`, the futures quote/open body) —
    pass it through directly. Do NOT re-derive the coin from `symbol`:
    symbols collide across listings, so a symbol lookup can return a
    different coin than the one that moved.

    `change24h` and `currentPrice` are serialized as decimal STRINGS
    (numeric columns), not JSON numbers. Values refresh on the ~60s core
    price tick.

    Args:
        limit (int | Unset):  Default: 3.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | list[PublicCryptoMover]
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
        )
    ).parsed
