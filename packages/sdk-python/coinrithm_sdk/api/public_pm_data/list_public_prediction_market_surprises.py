from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.list_public_prediction_market_surprises_window import ListPublicPredictionMarketSurprisesWindow
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...models.public_pm_surprises_response import PublicPmSurprisesResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    window: ListPublicPredictionMarketSurprisesWindow | Unset = ListPublicPredictionMarketSurprisesWindow.ALL,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["offset"] = offset

    params["fiat"] = fiat

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    json_window: str | Unset = UNSET
    if not isinstance(window, Unset):
        json_window = window.value

    params["window"] = json_window

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/surprises",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmSurprisesResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmSurprisesResponse.from_dict(response.json())

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
) -> Response[Error | PublicPmSurprisesResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    window: ListPublicPredictionMarketSurprisesWindow | Unset = ListPublicPredictionMarketSurprisesWindow.ALL,
) -> Response[Error | PublicPmSurprisesResponse]:
    r"""Biggest resolved-market surprises (\"flips\")

     Keyless \"surprise index\": resolved BINARY (exactly two outcomes)
    markets whose eventual winner was priced under 50 (of 100) roughly 24
    hours before settlement, ordered by the lowest T-24h winner
    probability first. Only provider-resolution-basis events qualify;
    multi-strike ladder markets are excluded because their non-leading
    strikes are structurally near zero and are not a real surprise
    signal. Same resolvedAt/closedAt honesty rule as `/resolved`:
    `resolvedAt` is populated only when provider-verified.

    `surprise.t24hProbability` and `surprise.t7dProbability` are the
    WINNING outcome's probability, 0-100 points, at T-24h and T-7d before
    resolution. `t7dProbability` is frequently null — not every market
    has 7 days of pre-resolution history.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        window (ListPublicPredictionMarketSurprisesWindow | Unset):  Default:
            ListPublicPredictionMarketSurprisesWindow.ALL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmSurprisesResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        fiat=fiat,
        source=source,
        window=window,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    window: ListPublicPredictionMarketSurprisesWindow | Unset = ListPublicPredictionMarketSurprisesWindow.ALL,
) -> Error | PublicPmSurprisesResponse | None:
    r"""Biggest resolved-market surprises (\"flips\")

     Keyless \"surprise index\": resolved BINARY (exactly two outcomes)
    markets whose eventual winner was priced under 50 (of 100) roughly 24
    hours before settlement, ordered by the lowest T-24h winner
    probability first. Only provider-resolution-basis events qualify;
    multi-strike ladder markets are excluded because their non-leading
    strikes are structurally near zero and are not a real surprise
    signal. Same resolvedAt/closedAt honesty rule as `/resolved`:
    `resolvedAt` is populated only when provider-verified.

    `surprise.t24hProbability` and `surprise.t7dProbability` are the
    WINNING outcome's probability, 0-100 points, at T-24h and T-7d before
    resolution. `t7dProbability` is frequently null — not every market
    has 7 days of pre-resolution history.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        window (ListPublicPredictionMarketSurprisesWindow | Unset):  Default:
            ListPublicPredictionMarketSurprisesWindow.ALL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmSurprisesResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        offset=offset,
        fiat=fiat,
        source=source,
        window=window,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    window: ListPublicPredictionMarketSurprisesWindow | Unset = ListPublicPredictionMarketSurprisesWindow.ALL,
) -> Response[Error | PublicPmSurprisesResponse]:
    r"""Biggest resolved-market surprises (\"flips\")

     Keyless \"surprise index\": resolved BINARY (exactly two outcomes)
    markets whose eventual winner was priced under 50 (of 100) roughly 24
    hours before settlement, ordered by the lowest T-24h winner
    probability first. Only provider-resolution-basis events qualify;
    multi-strike ladder markets are excluded because their non-leading
    strikes are structurally near zero and are not a real surprise
    signal. Same resolvedAt/closedAt honesty rule as `/resolved`:
    `resolvedAt` is populated only when provider-verified.

    `surprise.t24hProbability` and `surprise.t7dProbability` are the
    WINNING outcome's probability, 0-100 points, at T-24h and T-7d before
    resolution. `t7dProbability` is frequently null — not every market
    has 7 days of pre-resolution history.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        window (ListPublicPredictionMarketSurprisesWindow | Unset):  Default:
            ListPublicPredictionMarketSurprisesWindow.ALL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmSurprisesResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        fiat=fiat,
        source=source,
        window=window,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 24,
    offset: int | Unset = 0,
    fiat: str | Unset = "USD",
    source: PublicPmSourceSlug | Unset = UNSET,
    window: ListPublicPredictionMarketSurprisesWindow | Unset = ListPublicPredictionMarketSurprisesWindow.ALL,
) -> Error | PublicPmSurprisesResponse | None:
    r"""Biggest resolved-market surprises (\"flips\")

     Keyless \"surprise index\": resolved BINARY (exactly two outcomes)
    markets whose eventual winner was priced under 50 (of 100) roughly 24
    hours before settlement, ordered by the lowest T-24h winner
    probability first. Only provider-resolution-basis events qualify;
    multi-strike ladder markets are excluded because their non-leading
    strikes are structurally near zero and are not a real surprise
    signal. Same resolvedAt/closedAt honesty rule as `/resolved`:
    `resolvedAt` is populated only when provider-verified.

    `surprise.t24hProbability` and `surprise.t7dProbability` are the
    WINNING outcome's probability, 0-100 points, at T-24h and T-7d before
    resolution. `t7dProbability` is frequently null — not every market
    has 7 days of pre-resolution history.

    Args:
        limit (int | Unset):  Default: 24.
        offset (int | Unset):  Default: 0.
        fiat (str | Unset):  Default: 'USD'.
        source (PublicPmSourceSlug | Unset):
        window (ListPublicPredictionMarketSurprisesWindow | Unset):  Default:
            ListPublicPredictionMarketSurprisesWindow.ALL.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmSurprisesResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            offset=offset,
            fiat=fiat,
            source=source,
            window=window,
        )
    ).parsed
