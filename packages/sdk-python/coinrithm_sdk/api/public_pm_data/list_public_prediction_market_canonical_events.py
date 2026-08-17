from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_canonical_list_response import PublicPmCanonicalListResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 50,
    cursor: int | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["cursor"] = cursor

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/canonical",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmCanonicalListResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmCanonicalListResponse.from_dict(response.json())

        return response_200

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmCanonicalListResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 50,
    cursor: int | Unset = UNSET,
) -> Response[Error | PublicPmCanonicalListResponse]:
    """List canonical cross-venue event identities

     Keyless cursor-paged directory of active canonical events — CoinRithm's
    stable cross-venue identity for one real-world question, independent of
    any single venue's slug.

    The identifier is specified as an adoptable standard, including its
    permanence guarantees and the rule that a merged key never 404s:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    Lists ACTIVE canonicals only; merged ones remain resolvable by key via
    the detail endpoint. A canonical exists only where at least two venues
    listed the same question, so this is a cross-venue cluster directory
    rather than a catalogue of every event.

    Args:
        limit (int | Unset):  Default: 50.
        cursor (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmCanonicalListResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        cursor=cursor,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 50,
    cursor: int | Unset = UNSET,
) -> Error | PublicPmCanonicalListResponse | None:
    """List canonical cross-venue event identities

     Keyless cursor-paged directory of active canonical events — CoinRithm's
    stable cross-venue identity for one real-world question, independent of
    any single venue's slug.

    The identifier is specified as an adoptable standard, including its
    permanence guarantees and the rule that a merged key never 404s:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    Lists ACTIVE canonicals only; merged ones remain resolvable by key via
    the detail endpoint. A canonical exists only where at least two venues
    listed the same question, so this is a cross-venue cluster directory
    rather than a catalogue of every event.

    Args:
        limit (int | Unset):  Default: 50.
        cursor (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmCanonicalListResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        cursor=cursor,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 50,
    cursor: int | Unset = UNSET,
) -> Response[Error | PublicPmCanonicalListResponse]:
    """List canonical cross-venue event identities

     Keyless cursor-paged directory of active canonical events — CoinRithm's
    stable cross-venue identity for one real-world question, independent of
    any single venue's slug.

    The identifier is specified as an adoptable standard, including its
    permanence guarantees and the rule that a merged key never 404s:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    Lists ACTIVE canonicals only; merged ones remain resolvable by key via
    the detail endpoint. A canonical exists only where at least two venues
    listed the same question, so this is a cross-venue cluster directory
    rather than a catalogue of every event.

    Args:
        limit (int | Unset):  Default: 50.
        cursor (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmCanonicalListResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        cursor=cursor,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 50,
    cursor: int | Unset = UNSET,
) -> Error | PublicPmCanonicalListResponse | None:
    """List canonical cross-venue event identities

     Keyless cursor-paged directory of active canonical events — CoinRithm's
    stable cross-venue identity for one real-world question, independent of
    any single venue's slug.

    The identifier is specified as an adoptable standard, including its
    permanence guarantees and the rule that a merged key never 404s:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    Lists ACTIVE canonicals only; merged ones remain resolvable by key via
    the detail endpoint. A canonical exists only where at least two venues
    listed the same question, so this is a cross-venue cluster directory
    rather than a catalogue of every event.

    Args:
        limit (int | Unset):  Default: 50.
        cursor (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmCanonicalListResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            cursor=cursor,
        )
    ).parsed
