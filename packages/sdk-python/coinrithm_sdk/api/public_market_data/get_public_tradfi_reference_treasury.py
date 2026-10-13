from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.public_message_error import PublicMessageError
from ...models.public_ticker_treasury_response import PublicTickerTreasuryResponse
from ...types import Response


def _get_kwargs(
    ticker: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/references/{ticker}/treasury".format(
            ticker=quote(str(ticker), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicMessageError | PublicTickerTreasuryResponse | None:
    if response.status_code == 200:
        response_200 = PublicTickerTreasuryResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = PublicMessageError.from_dict(response.json())

        return response_400

    if response.status_code == 404:
        response_404 = PublicMessageError.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | PublicMessageError | PublicTickerTreasuryResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | PublicMessageError | PublicTickerTreasuryResponse]:
    """A listed company's crypto treasury

     Keyless crypto holdings (BTC, ETH, SOL, BNB) of the company behind a
    catalog ticker, from the same CoinGecko data as
    `/api/market/treasuries/{coin}`. Only plain US-listed equities in
    the catalog can match. `treasury` is null when the company holds
    none of the four coins (or is not matched); `status` combines the
    four coin datasets (`fresh` when all are fresh, `unavailable` when
    none is usable, otherwise `stale`), and `asOf` is the oldest
    dataset read. Keep the `source` attribution next to any display.
    A ticker outside the catalog returns 404.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicTickerTreasuryResponse]
    """

    kwargs = _get_kwargs(
        ticker=ticker,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | PublicMessageError | PublicTickerTreasuryResponse | None:
    """A listed company's crypto treasury

     Keyless crypto holdings (BTC, ETH, SOL, BNB) of the company behind a
    catalog ticker, from the same CoinGecko data as
    `/api/market/treasuries/{coin}`. Only plain US-listed equities in
    the catalog can match. `treasury` is null when the company holds
    none of the four coins (or is not matched); `status` combines the
    four coin datasets (`fresh` when all are fresh, `unavailable` when
    none is usable, otherwise `stale`), and `asOf` is the oldest
    dataset read. Keep the `source` attribution next to any display.
    A ticker outside the catalog returns 404.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicTickerTreasuryResponse
    """

    return sync_detailed(
        ticker=ticker,
        client=client,
    ).parsed


async def asyncio_detailed(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | PublicMessageError | PublicTickerTreasuryResponse]:
    """A listed company's crypto treasury

     Keyless crypto holdings (BTC, ETH, SOL, BNB) of the company behind a
    catalog ticker, from the same CoinGecko data as
    `/api/market/treasuries/{coin}`. Only plain US-listed equities in
    the catalog can match. `treasury` is null when the company holds
    none of the four coins (or is not matched); `status` combines the
    four coin datasets (`fresh` when all are fresh, `unavailable` when
    none is usable, otherwise `stale`), and `asOf` is the oldest
    dataset read. Keep the `source` attribution next to any display.
    A ticker outside the catalog returns 404.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicTickerTreasuryResponse]
    """

    kwargs = _get_kwargs(
        ticker=ticker,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | PublicMessageError | PublicTickerTreasuryResponse | None:
    """A listed company's crypto treasury

     Keyless crypto holdings (BTC, ETH, SOL, BNB) of the company behind a
    catalog ticker, from the same CoinGecko data as
    `/api/market/treasuries/{coin}`. Only plain US-listed equities in
    the catalog can match. `treasury` is null when the company holds
    none of the four coins (or is not matched); `status` combines the
    four coin datasets (`fresh` when all are fresh, `unavailable` when
    none is usable, otherwise `stale`), and `asOf` is the oldest
    dataset read. Keep the `source` attribution next to any display.
    A ticker outside the catalog returns 404.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicTickerTreasuryResponse
    """

    return (
        await asyncio_detailed(
            ticker=ticker,
            client=client,
        )
    ).parsed
