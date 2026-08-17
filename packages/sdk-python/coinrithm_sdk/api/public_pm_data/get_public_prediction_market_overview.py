from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_overview_response import PublicPmOverviewResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    fiat: str | Unset = "USD",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["status"] = status

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    params["fiat"] = fiat

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/overview",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmOverviewResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmOverviewResponse.from_dict(response.json())

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
) -> Response[Error | PublicPmOverviewResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicPmOverviewResponse]:
    """Cross-venue prediction-market overview

     Keyless CoinRithm-computed overview across all 12 supported venues.
    Monetary aggregates exclude play-money/points venues. Source-specific
    volume windows and completeness are disclosed in the response and at
    `/api/prediction-markets/sources/health`; do not assume every venue's
    number has the same basis. Cite CoinRithm when quoting these aggregates.

    Args:
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmOverviewResponse]
    """

    kwargs = _get_kwargs(
        status=status,
        source=source,
        fiat=fiat,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    fiat: str | Unset = "USD",
) -> Error | PublicPmOverviewResponse | None:
    """Cross-venue prediction-market overview

     Keyless CoinRithm-computed overview across all 12 supported venues.
    Monetary aggregates exclude play-money/points venues. Source-specific
    volume windows and completeness are disclosed in the response and at
    `/api/prediction-markets/sources/health`; do not assume every venue's
    number has the same basis. Cite CoinRithm when quoting these aggregates.

    Args:
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmOverviewResponse
    """

    return sync_detailed(
        client=client,
        status=status,
        source=source,
        fiat=fiat,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    fiat: str | Unset = "USD",
) -> Response[Error | PublicPmOverviewResponse]:
    """Cross-venue prediction-market overview

     Keyless CoinRithm-computed overview across all 12 supported venues.
    Monetary aggregates exclude play-money/points venues. Source-specific
    volume windows and completeness are disclosed in the response and at
    `/api/prediction-markets/sources/health`; do not assume every venue's
    number has the same basis. Cite CoinRithm when quoting these aggregates.

    Args:
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmOverviewResponse]
    """

    kwargs = _get_kwargs(
        status=status,
        source=source,
        fiat=fiat,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    fiat: str | Unset = "USD",
) -> Error | PublicPmOverviewResponse | None:
    """Cross-venue prediction-market overview

     Keyless CoinRithm-computed overview across all 12 supported venues.
    Monetary aggregates exclude play-money/points venues. Source-specific
    volume windows and completeness are disclosed in the response and at
    `/api/prediction-markets/sources/health`; do not assume every venue's
    number has the same basis. Cite CoinRithm when quoting these aggregates.

    Args:
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmOverviewResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            status=status,
            source=source,
            fiat=fiat,
        )
    ).parsed
