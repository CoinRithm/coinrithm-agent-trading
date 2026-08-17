from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.wallet import Wallet
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    coin_id: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["coinId"] = coin_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/wallet",
        "params": params,
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | Wallet | None:
    if response.status_code == 200:
        response_200 = Wallet.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | Wallet]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    coin_id: str | Unset = UNSET,
) -> Response[Error | Wallet]:
    """Raw wallet balances incl. frozen partitions

     USDT cash with its three frozen partitions (spot orders, PM, futures),
    plus one optional coin asset if `coinId` is given. Requires scope `read`.

    Args:
        coin_id (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Wallet]
    """

    kwargs = _get_kwargs(
        coin_id=coin_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    coin_id: str | Unset = UNSET,
) -> Error | Wallet | None:
    """Raw wallet balances incl. frozen partitions

     USDT cash with its three frozen partitions (spot orders, PM, futures),
    plus one optional coin asset if `coinId` is given. Requires scope `read`.

    Args:
        coin_id (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Wallet
    """

    return sync_detailed(
        client=client,
        coin_id=coin_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    coin_id: str | Unset = UNSET,
) -> Response[Error | Wallet]:
    """Raw wallet balances incl. frozen partitions

     USDT cash with its three frozen partitions (spot orders, PM, futures),
    plus one optional coin asset if `coinId` is given. Requires scope `read`.

    Args:
        coin_id (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Wallet]
    """

    kwargs = _get_kwargs(
        coin_id=coin_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    coin_id: str | Unset = UNSET,
) -> Error | Wallet | None:
    """Raw wallet balances incl. frozen partitions

     USDT cash with its three frozen partitions (spot orders, PM, futures),
    plus one optional coin asset if `coinId` is given. Requires scope `read`.

    Args:
        coin_id (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Wallet
    """

    return (
        await asyncio_detailed(
            client=client,
            coin_id=coin_id,
        )
    ).parsed
