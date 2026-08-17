from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_volume_history_response import PublicPmVolumeHistoryResponse
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/volume-history",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmVolumeHistoryResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmVolumeHistoryResponse.from_dict(response.json())

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
) -> Response[Error | PublicPmVolumeHistoryResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmVolumeHistoryResponse]:
    """Global daily prediction-market volume trend

     Keyless daily volume series (day-over-day delta of cumulative volume,
    summed across real-money venues only) with a per-venue breakdown,
    captured since 2026-07-02 and bounded to a rolling ~90-day window. A
    day or venue with no known value is a gap (null), never a zero bar.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmVolumeHistoryResponse]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmVolumeHistoryResponse | None:
    """Global daily prediction-market volume trend

     Keyless daily volume series (day-over-day delta of cumulative volume,
    summed across real-money venues only) with a per-venue breakdown,
    captured since 2026-07-02 and bounded to a rolling ~90-day window. A
    day or venue with no known value is a gap (null), never a zero bar.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmVolumeHistoryResponse
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmVolumeHistoryResponse]:
    """Global daily prediction-market volume trend

     Keyless daily volume series (day-over-day delta of cumulative volume,
    summed across real-money venues only) with a per-venue breakdown,
    captured since 2026-07-02 and bounded to a rolling ~90-day window. A
    day or venue with no known value is a gap (null), never a zero bar.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmVolumeHistoryResponse]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmVolumeHistoryResponse | None:
    """Global daily prediction-market volume trend

     Keyless daily volume series (day-over-day delta of cumulative volume,
    summed across real-money venues only) with a per-venue breakdown,
    captured since 2026-07-02 and bounded to a rolling ~90-day window. A
    day or venue with no known value is a gap (null), never a zero bar.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmVolumeHistoryResponse
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
