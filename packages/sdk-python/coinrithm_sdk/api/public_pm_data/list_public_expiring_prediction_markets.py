from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_expiring_events_response import PublicPmExpiringEventsResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    days: int | Unset = 7,
    source: PublicPmSourceSlug | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["offset"] = offset

    params["fiat"] = fiat

    params["days"] = days

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/expiring",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmExpiringEventsResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmExpiringEventsResponse.from_dict(response.json())

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
) -> Response[Error | PublicPmExpiringEventsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    days: int | Unset = 7,
    source: PublicPmSourceSlug | Unset = UNSET,
) -> Response[Error | PublicPmExpiringEventsResponse]:
    """Open prediction markets expiring soon

     Keyless catalog of OPEN events whose `endDate` falls within the
    lookahead window (`days`, default 7), soonest end first. Requires
    24h volume >= 1000 or lifetime volume >= 10000 in the venue's raw
    (pre-fiat-conversion) units, so thin/inactive markets are excluded.
    Each row is a full event plus `expiresInMs`: milliseconds from the
    response time to `endDate`.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        days (int | Unset):  Default: 7.
        source (PublicPmSourceSlug | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmExpiringEventsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        fiat=fiat,
        days=days,
        source=source,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    days: int | Unset = 7,
    source: PublicPmSourceSlug | Unset = UNSET,
) -> Error | PublicPmExpiringEventsResponse | None:
    """Open prediction markets expiring soon

     Keyless catalog of OPEN events whose `endDate` falls within the
    lookahead window (`days`, default 7), soonest end first. Requires
    24h volume >= 1000 or lifetime volume >= 10000 in the venue's raw
    (pre-fiat-conversion) units, so thin/inactive markets are excluded.
    Each row is a full event plus `expiresInMs`: milliseconds from the
    response time to `endDate`.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        days (int | Unset):  Default: 7.
        source (PublicPmSourceSlug | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmExpiringEventsResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        offset=offset,
        fiat=fiat,
        days=days,
        source=source,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    days: int | Unset = 7,
    source: PublicPmSourceSlug | Unset = UNSET,
) -> Response[Error | PublicPmExpiringEventsResponse]:
    """Open prediction markets expiring soon

     Keyless catalog of OPEN events whose `endDate` falls within the
    lookahead window (`days`, default 7), soonest end first. Requires
    24h volume >= 1000 or lifetime volume >= 10000 in the venue's raw
    (pre-fiat-conversion) units, so thin/inactive markets are excluded.
    Each row is a full event plus `expiresInMs`: milliseconds from the
    response time to `endDate`.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        days (int | Unset):  Default: 7.
        source (PublicPmSourceSlug | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmExpiringEventsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        fiat=fiat,
        days=days,
        source=source,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    days: int | Unset = 7,
    source: PublicPmSourceSlug | Unset = UNSET,
) -> Error | PublicPmExpiringEventsResponse | None:
    """Open prediction markets expiring soon

     Keyless catalog of OPEN events whose `endDate` falls within the
    lookahead window (`days`, default 7), soonest end first. Requires
    24h volume >= 1000 or lifetime volume >= 10000 in the venue's raw
    (pre-fiat-conversion) units, so thin/inactive markets are excluded.
    Each row is a full event plus `expiresInMs`: milliseconds from the
    response time to `endDate`.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        days (int | Unset):  Default: 7.
        source (PublicPmSourceSlug | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmExpiringEventsResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            offset=offset,
            fiat=fiat,
            days=days,
            source=source,
        )
    ).parsed
