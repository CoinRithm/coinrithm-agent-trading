from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.public_message_error import PublicMessageError
from ...models.public_sec_filings_response import PublicSecFilingsResponse
from ...types import Response


def _get_kwargs(
    ticker: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/references/{ticker}/filings".format(
            ticker=quote(str(ticker), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicMessageError | PublicSecFilingsResponse | None:
    if response.status_code == 200:
        response_200 = PublicSecFilingsResponse.from_dict(response.json())

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

    if response.status_code == 500:
        response_500 = PublicMessageError.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | PublicMessageError | PublicSecFilingsResponse]:
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
) -> Response[Any | PublicMessageError | PublicSecFilingsResponse]:
    """SEC Form 4 insider transactions for a reference

     Keyless SEC EDGAR Form 4 insider transactions (non-derivative table)
    for one catalog ticker: up to 50 latest transactions of every code
    and up to 20 latest open-market purchases and sales (codes `P` and
    `S`), newest filing first. Every row links to its original filing
    on sec.gov. Form 4 is due within two business days of the trade, so
    `filedAt` can trail `transactionDate`.

    `coverage` is `not_applicable` for instruments that do not file
    Form 4 (metals, commodities, FX, non-US home listings),
    `none_recorded` when no transaction has been collected yet, and
    `available` otherwise. Dates are `YYYY-MM-DD` strings. Shares,
    prices and values are null when the filing omits them. A ticker
    outside the catalog returns 404. The response is shared-cached for
    about 10 minutes.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicSecFilingsResponse]
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
) -> Any | PublicMessageError | PublicSecFilingsResponse | None:
    """SEC Form 4 insider transactions for a reference

     Keyless SEC EDGAR Form 4 insider transactions (non-derivative table)
    for one catalog ticker: up to 50 latest transactions of every code
    and up to 20 latest open-market purchases and sales (codes `P` and
    `S`), newest filing first. Every row links to its original filing
    on sec.gov. Form 4 is due within two business days of the trade, so
    `filedAt` can trail `transactionDate`.

    `coverage` is `not_applicable` for instruments that do not file
    Form 4 (metals, commodities, FX, non-US home listings),
    `none_recorded` when no transaction has been collected yet, and
    `available` otherwise. Dates are `YYYY-MM-DD` strings. Shares,
    prices and values are null when the filing omits them. A ticker
    outside the catalog returns 404. The response is shared-cached for
    about 10 minutes.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicSecFilingsResponse
    """

    return sync_detailed(
        ticker=ticker,
        client=client,
    ).parsed


async def asyncio_detailed(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | PublicMessageError | PublicSecFilingsResponse]:
    """SEC Form 4 insider transactions for a reference

     Keyless SEC EDGAR Form 4 insider transactions (non-derivative table)
    for one catalog ticker: up to 50 latest transactions of every code
    and up to 20 latest open-market purchases and sales (codes `P` and
    `S`), newest filing first. Every row links to its original filing
    on sec.gov. Form 4 is due within two business days of the trade, so
    `filedAt` can trail `transactionDate`.

    `coverage` is `not_applicable` for instruments that do not file
    Form 4 (metals, commodities, FX, non-US home listings),
    `none_recorded` when no transaction has been collected yet, and
    `available` otherwise. Dates are `YYYY-MM-DD` strings. Shares,
    prices and values are null when the filing omits them. A ticker
    outside the catalog returns 404. The response is shared-cached for
    about 10 minutes.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicSecFilingsResponse]
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
) -> Any | PublicMessageError | PublicSecFilingsResponse | None:
    """SEC Form 4 insider transactions for a reference

     Keyless SEC EDGAR Form 4 insider transactions (non-derivative table)
    for one catalog ticker: up to 50 latest transactions of every code
    and up to 20 latest open-market purchases and sales (codes `P` and
    `S`), newest filing first. Every row links to its original filing
    on sec.gov. Form 4 is due within two business days of the trade, so
    `filedAt` can trail `transactionDate`.

    `coverage` is `not_applicable` for instruments that do not file
    Form 4 (metals, commodities, FX, non-US home listings),
    `none_recorded` when no transaction has been collected yet, and
    `available` otherwise. Dates are `YYYY-MM-DD` strings. Shares,
    prices and values are null when the filing omits them. A ticker
    outside the catalog returns 404. The response is shared-cached for
    about 10 minutes.

    Args:
        ticker (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicSecFilingsResponse
    """

    return (
        await asyncio_detailed(
            ticker=ticker,
            client=client,
        )
    ).parsed
