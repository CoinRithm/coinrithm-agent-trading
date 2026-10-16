from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_market_snapshot import PublicMarketSnapshot
from ...models.public_message_error import PublicMessageError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    fiat: str | Unset = "USD",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["fiat"] = fiat

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/snapshot",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicMarketSnapshot | PublicMessageError | None:
    if response.status_code == 200:
        response_200 = PublicMarketSnapshot.from_dict(response.json())

        return response_200

    if response.status_code == 404:
        response_404 = PublicMessageError.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if response.status_code == 500:
        response_500 = PublicMessageError.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicMarketSnapshot | PublicMessageError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicMarketSnapshot | PublicMessageError]:
    """Global crypto market snapshot

     Keyless latest global snapshot: total market cap and 24h volume (in
    `fiat`) with their 24h change in percent, BTC and ETH dominance, ETH
    gas, tracked coin and exchange counts, and the Fear and Greed index.
    Keys are lower-case, as served. `date` is the snapshot minute and
    `createdat` its write time; it refreshes about every minute.
    `stablecoinvolume` and `defivolume` were 0 with null change in every
    2026-10-16 probe: do not read that 0 as zero volume.

    `fiat` is upper-cased; an untracked code is echoed in
    `fiatcurrency` with `fiatratetousd: 1` and USD values. Query
    parameters other than `fiat` are ignored. Also served at
    `/api/v1/market/snapshot` with identical behaviour.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicMarketSnapshot | PublicMessageError]
    """

    kwargs = _get_kwargs(
        fiat=fiat,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Error | PublicMarketSnapshot | PublicMessageError | None:
    """Global crypto market snapshot

     Keyless latest global snapshot: total market cap and 24h volume (in
    `fiat`) with their 24h change in percent, BTC and ETH dominance, ETH
    gas, tracked coin and exchange counts, and the Fear and Greed index.
    Keys are lower-case, as served. `date` is the snapshot minute and
    `createdat` its write time; it refreshes about every minute.
    `stablecoinvolume` and `defivolume` were 0 with null change in every
    2026-10-16 probe: do not read that 0 as zero volume.

    `fiat` is upper-cased; an untracked code is echoed in
    `fiatcurrency` with `fiatratetousd: 1` and USD values. Query
    parameters other than `fiat` are ignored. Also served at
    `/api/v1/market/snapshot` with identical behaviour.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicMarketSnapshot | PublicMessageError
    """

    return sync_detailed(
        client=client,
        fiat=fiat,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicMarketSnapshot | PublicMessageError]:
    """Global crypto market snapshot

     Keyless latest global snapshot: total market cap and 24h volume (in
    `fiat`) with their 24h change in percent, BTC and ETH dominance, ETH
    gas, tracked coin and exchange counts, and the Fear and Greed index.
    Keys are lower-case, as served. `date` is the snapshot minute and
    `createdat` its write time; it refreshes about every minute.
    `stablecoinvolume` and `defivolume` were 0 with null change in every
    2026-10-16 probe: do not read that 0 as zero volume.

    `fiat` is upper-cased; an untracked code is echoed in
    `fiatcurrency` with `fiatratetousd: 1` and USD values. Query
    parameters other than `fiat` are ignored. Also served at
    `/api/v1/market/snapshot` with identical behaviour.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicMarketSnapshot | PublicMessageError]
    """

    kwargs = _get_kwargs(
        fiat=fiat,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Error | PublicMarketSnapshot | PublicMessageError | None:
    """Global crypto market snapshot

     Keyless latest global snapshot: total market cap and 24h volume (in
    `fiat`) with their 24h change in percent, BTC and ETH dominance, ETH
    gas, tracked coin and exchange counts, and the Fear and Greed index.
    Keys are lower-case, as served. `date` is the snapshot minute and
    `createdat` its write time; it refreshes about every minute.
    `stablecoinvolume` and `defivolume` were 0 with null change in every
    2026-10-16 probe: do not read that 0 as zero volume.

    `fiat` is upper-cased; an untracked code is echoed in
    `fiatcurrency` with `fiatratetousd: 1` and USD values. Query
    parameters other than `fiat` are ignored. Also served at
    `/api/v1/market/snapshot` with identical behaviour.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicMarketSnapshot | PublicMessageError
    """

    return (
        await asyncio_detailed(
            client=client,
            fiat=fiat,
        )
    ).parsed
