from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_order_book_response import PublicPmOrderBookResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...types import Response


def _get_kwargs(
    source: PublicPmSourceSlug,
    slug: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/event/{source}/{slug}/orderbook".format(
            source=quote(str(source), safe=""),
            slug=quote(str(slug), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmOrderBookResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmOrderBookResponse.from_dict(response.json())

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

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmOrderBookResponse]:
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
) -> Response[Error | PublicPmOrderBookResponse]:
    r"""Live order book for one outcome of an event

     Keyless live order book for the SAME single outcome `price-history`
    describes (the Yes leg of a binary market, else the first outcome in
    venue order). Polymarket and Kalshi only; other sources answer 200
    with `orderBook: null`, which means \"not served here\", not \"no
    market\". A thin or near-expiry market with no resting orders on
    either side also answers 200 with `orderBook: null` — a valid empty
    shape, not an error.

    `bid`/`ask`/`midpoint`/level `price` are probabilities 0-1 (a
    fraction), NOT the 0-100 scale used by `PublicPmOutcome.probability`
    elsewhere in this API. This is fetch-time venue depth, not an
    executable quote or a tradability guarantee — use the quote/mock-open
    flow for that.

    `askEvidence` is present only for Polymarket books: it records
    whether the supplied ask snapshot parsed as a valid non-empty book
    (`validated`) and when this server fetched it (`receivedAt`, its own
    acquisition time, not an upstream trade time). Kalshi books omit it.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmOrderBookResponse]
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
) -> Error | PublicPmOrderBookResponse | None:
    r"""Live order book for one outcome of an event

     Keyless live order book for the SAME single outcome `price-history`
    describes (the Yes leg of a binary market, else the first outcome in
    venue order). Polymarket and Kalshi only; other sources answer 200
    with `orderBook: null`, which means \"not served here\", not \"no
    market\". A thin or near-expiry market with no resting orders on
    either side also answers 200 with `orderBook: null` — a valid empty
    shape, not an error.

    `bid`/`ask`/`midpoint`/level `price` are probabilities 0-1 (a
    fraction), NOT the 0-100 scale used by `PublicPmOutcome.probability`
    elsewhere in this API. This is fetch-time venue depth, not an
    executable quote or a tradability guarantee — use the quote/mock-open
    flow for that.

    `askEvidence` is present only for Polymarket books: it records
    whether the supplied ask snapshot parsed as a valid non-empty book
    (`validated`) and when this server fetched it (`receivedAt`, its own
    acquisition time, not an upstream trade time). Kalshi books omit it.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmOrderBookResponse
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
) -> Response[Error | PublicPmOrderBookResponse]:
    r"""Live order book for one outcome of an event

     Keyless live order book for the SAME single outcome `price-history`
    describes (the Yes leg of a binary market, else the first outcome in
    venue order). Polymarket and Kalshi only; other sources answer 200
    with `orderBook: null`, which means \"not served here\", not \"no
    market\". A thin or near-expiry market with no resting orders on
    either side also answers 200 with `orderBook: null` — a valid empty
    shape, not an error.

    `bid`/`ask`/`midpoint`/level `price` are probabilities 0-1 (a
    fraction), NOT the 0-100 scale used by `PublicPmOutcome.probability`
    elsewhere in this API. This is fetch-time venue depth, not an
    executable quote or a tradability guarantee — use the quote/mock-open
    flow for that.

    `askEvidence` is present only for Polymarket books: it records
    whether the supplied ask snapshot parsed as a valid non-empty book
    (`validated`) and when this server fetched it (`receivedAt`, its own
    acquisition time, not an upstream trade time). Kalshi books omit it.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmOrderBookResponse]
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
) -> Error | PublicPmOrderBookResponse | None:
    r"""Live order book for one outcome of an event

     Keyless live order book for the SAME single outcome `price-history`
    describes (the Yes leg of a binary market, else the first outcome in
    venue order). Polymarket and Kalshi only; other sources answer 200
    with `orderBook: null`, which means \"not served here\", not \"no
    market\". A thin or near-expiry market with no resting orders on
    either side also answers 200 with `orderBook: null` — a valid empty
    shape, not an error.

    `bid`/`ask`/`midpoint`/level `price` are probabilities 0-1 (a
    fraction), NOT the 0-100 scale used by `PublicPmOutcome.probability`
    elsewhere in this API. This is fetch-time venue depth, not an
    executable quote or a tradability guarantee — use the quote/mock-open
    flow for that.

    `askEvidence` is present only for Polymarket books: it records
    whether the supplied ask snapshot parsed as a valid non-empty book
    (`validated`) and when this server fetched it (`receivedAt`, its own
    acquisition time, not an upstream trade time). Kalshi books omit it.

    Args:
        source (PublicPmSourceSlug):
        slug (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmOrderBookResponse
    """

    return (
        await asyncio_detailed(
            source=source,
            slug=slug,
            client=client,
        )
    ).parsed
