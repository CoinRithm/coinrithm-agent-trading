from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_whales_response import PublicPmWhalesResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 50,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/whales",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | Error | PublicPmWhalesResponse | None:
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


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | Error | PublicPmWhalesResponse]:
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
) -> Response[Any | Error | PublicPmWhalesResponse]:
    """Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    The tape is a single cached payload of at most 50 trades. `limit`
    narrows what is returned from it — useful for an embed or a
    low-bandwidth client that wants 5 rows rather than 50. It cannot widen
    the tape: values above 50 clamp, and a missing or malformed value
    returns the full tape rather than a 400.

    Args:
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmWhalesResponse]
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
    limit: int | Unset = 50,
) -> Any | Error | PublicPmWhalesResponse | None:
    """Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    The tape is a single cached payload of at most 50 trades. `limit`
    narrows what is returned from it — useful for an embed or a
    low-bandwidth client that wants 5 rows rather than 50. It cannot widen
    the tape: values above 50 clamp, and a missing or malformed value
    returns the full tape rather than a 400.

    Args:
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmWhalesResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 50,
) -> Response[Any | Error | PublicPmWhalesResponse]:
    """Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    The tape is a single cached payload of at most 50 trades. `limit`
    narrows what is returned from it — useful for an embed or a
    low-bandwidth client that wants 5 rows rather than 50. It cannot widen
    the tape: values above 50 clamp, and a missing or malformed value
    returns the full tape rather than a 400.

    Args:
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmWhalesResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 50,
) -> Any | Error | PublicPmWhalesResponse | None:
    """Latest verified large prediction-market trades

     Keyless large-trade tape with source-specific evidence, provenance and
    24-hour aggregates. Availability can be live, delayed or unavailable;
    play-money and unverifiable activity are excluded. A large print is
    information, not a recommendation.

    The tape is a single cached payload of at most 50 trades. `limit`
    narrows what is returned from it — useful for an embed or a
    low-bandwidth client that wants 5 rows rather than 50. It cannot widen
    the tape: values above 50 clamp, and a missing or malformed value
    returns the full tape rather than a 400.

    Args:
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmWhalesResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
        )
    ).parsed
