from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...models.public_pm_trades_response import PublicPmTradesResponse
from ...models.retryable_unavailable_error import RetryableUnavailableError
from ...types import Response


def _get_kwargs(
    source: PublicPmSourceSlug,
    slug: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/event/{source}/{slug}/trades".format(
            source=quote(str(source), safe=""),
            slug=quote(str(slug), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmTradesResponse | RetryableUnavailableError | None:
    if response.status_code == 200:
        response_200 = PublicPmTradesResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if response.status_code == 503:
        response_503 = RetryableUnavailableError.from_dict(response.json())

        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmTradesResponse | RetryableUnavailableError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmTradesResponse | RetryableUnavailableError]:
    r"""Recent trades for one outcome of an event

     Keyless recent-trades tape for the same single outcome
    `price-history`/`orderbook` describe. Always returns the most recent
    trades up to a fixed server cap of 20; there is no limit/offset
    parameter and none is read from the query string. Polymarket and
    Kalshi only; other sources answer 200 with `trades: []`, which means
    \"not served here\", not \"no trading\" — an event with genuinely no
    recent trades on a supported source also answers 200 with
    `trades: []`.

    `price` is a probability 0-1 (a fraction), NOT the 0-100 scale used
    by `PublicPmOutcome.probability` elsewhere in this API. `usdValue` is
    `size * price`. `who` is a public trader handle only where the venue
    exposes one (Polymarket pseudonym); Kalshi trades always report
    `who: null`, and an empty Polymarket handle is also served as null.
    When a Polymarket market's condition id is unavailable, the tape falls
    back to the whole event's trades (every outcome), and a row whose
    outcome cannot be identified carries `outcome: null`.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmTradesResponse | RetryableUnavailableError]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmTradesResponse | RetryableUnavailableError | None:
    r"""Recent trades for one outcome of an event

     Keyless recent-trades tape for the same single outcome
    `price-history`/`orderbook` describe. Always returns the most recent
    trades up to a fixed server cap of 20; there is no limit/offset
    parameter and none is read from the query string. Polymarket and
    Kalshi only; other sources answer 200 with `trades: []`, which means
    \"not served here\", not \"no trading\" — an event with genuinely no
    recent trades on a supported source also answers 200 with
    `trades: []`.

    `price` is a probability 0-1 (a fraction), NOT the 0-100 scale used
    by `PublicPmOutcome.probability` elsewhere in this API. `usdValue` is
    `size * price`. `who` is a public trader handle only where the venue
    exposes one (Polymarket pseudonym); Kalshi trades always report
    `who: null`, and an empty Polymarket handle is also served as null.
    When a Polymarket market's condition id is unavailable, the tape falls
    back to the whole event's trades (every outcome), and a row whose
    outcome cannot be identified carries `outcome: null`.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmTradesResponse | RetryableUnavailableError
    """

    return sync_detailed(
        source=source,
        slug=slug,
        client=client,
    ).parsed


async def asyncio_detailed(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmTradesResponse | RetryableUnavailableError]:
    r"""Recent trades for one outcome of an event

     Keyless recent-trades tape for the same single outcome
    `price-history`/`orderbook` describe. Always returns the most recent
    trades up to a fixed server cap of 20; there is no limit/offset
    parameter and none is read from the query string. Polymarket and
    Kalshi only; other sources answer 200 with `trades: []`, which means
    \"not served here\", not \"no trading\" — an event with genuinely no
    recent trades on a supported source also answers 200 with
    `trades: []`.

    `price` is a probability 0-1 (a fraction), NOT the 0-100 scale used
    by `PublicPmOutcome.probability` elsewhere in this API. `usdValue` is
    `size * price`. `who` is a public trader handle only where the venue
    exposes one (Polymarket pseudonym); Kalshi trades always report
    `who: null`, and an empty Polymarket handle is also served as null.
    When a Polymarket market's condition id is unavailable, the tape falls
    back to the whole event's trades (every outcome), and a row whose
    outcome cannot be identified carries `outcome: null`.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmTradesResponse | RetryableUnavailableError]
    """

    kwargs = _get_kwargs(
        source=source,
        slug=slug,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    source: PublicPmSourceSlug,
    slug: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmTradesResponse | RetryableUnavailableError | None:
    r"""Recent trades for one outcome of an event

     Keyless recent-trades tape for the same single outcome
    `price-history`/`orderbook` describe. Always returns the most recent
    trades up to a fixed server cap of 20; there is no limit/offset
    parameter and none is read from the query string. Polymarket and
    Kalshi only; other sources answer 200 with `trades: []`, which means
    \"not served here\", not \"no trading\" — an event with genuinely no
    recent trades on a supported source also answers 200 with
    `trades: []`.

    `price` is a probability 0-1 (a fraction), NOT the 0-100 scale used
    by `PublicPmOutcome.probability` elsewhere in this API. `usdValue` is
    `size * price`. `who` is a public trader handle only where the venue
    exposes one (Polymarket pseudonym); Kalshi trades always report
    `who: null`, and an empty Polymarket handle is also served as null.
    When a Polymarket market's condition id is unavailable, the tape falls
    back to the whole event's trades (every outcome), and a row whose
    outcome cannot be identified carries `outcome: null`.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmTradesResponse | RetryableUnavailableError
    """

    return (
        await asyncio_detailed(
            source=source,
            slug=slug,
            client=client,
        )
    ).parsed
