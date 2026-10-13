from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_public_tradfi_reference_window import GetPublicTradfiReferenceWindow
from ...models.public_message_error import PublicMessageError
from ...models.public_tradfi_reference_detail import PublicTradfiReferenceDetail
from ...types import UNSET, Response, Unset


def _get_kwargs(
    ticker: str,
    *,
    window: GetPublicTradfiReferenceWindow | Unset = GetPublicTradfiReferenceWindow.VALUE_0,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_window: str | Unset = UNSET
    if not isinstance(window, Unset):
        json_window = window.value

    params["window"] = json_window

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/market/references/{ticker}".format(
            ticker=quote(str(ticker), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | PublicMessageError | PublicTradfiReferenceDetail | None:
    if response.status_code == 200:
        response_200 = PublicTradfiReferenceDetail.from_dict(response.json())

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
) -> Response[Any | PublicMessageError | PublicTradfiReferenceDetail]:
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
    window: GetPublicTradfiReferenceWindow | Unset = GetPublicTradfiReferenceWindow.VALUE_0,
) -> Response[Any | PublicMessageError | PublicTradfiReferenceDetail]:
    """One TradFi reference with venue constituents and history

     Keyless detail for one catalog ticker: the latest validated
    consensus with each contributing venue's index price, derived
    change and range, the optional `live` overlay, and recorded
    15-minute history over `window` (24 hours or 7 days, oldest
    first). Same methodology and caveats as the catalog. A ticker
    outside the catalog returns 404.

    Args:
        ticker (str):
        window (GetPublicTradfiReferenceWindow | Unset):  Default:
            GetPublicTradfiReferenceWindow.VALUE_0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicTradfiReferenceDetail]
    """

    kwargs = _get_kwargs(
        ticker=ticker,
        window=window,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
    window: GetPublicTradfiReferenceWindow | Unset = GetPublicTradfiReferenceWindow.VALUE_0,
) -> Any | PublicMessageError | PublicTradfiReferenceDetail | None:
    """One TradFi reference with venue constituents and history

     Keyless detail for one catalog ticker: the latest validated
    consensus with each contributing venue's index price, derived
    change and range, the optional `live` overlay, and recorded
    15-minute history over `window` (24 hours or 7 days, oldest
    first). Same methodology and caveats as the catalog. A ticker
    outside the catalog returns 404.

    Args:
        ticker (str):
        window (GetPublicTradfiReferenceWindow | Unset):  Default:
            GetPublicTradfiReferenceWindow.VALUE_0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicTradfiReferenceDetail
    """

    return sync_detailed(
        ticker=ticker,
        client=client,
        window=window,
    ).parsed


async def asyncio_detailed(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
    window: GetPublicTradfiReferenceWindow | Unset = GetPublicTradfiReferenceWindow.VALUE_0,
) -> Response[Any | PublicMessageError | PublicTradfiReferenceDetail]:
    """One TradFi reference with venue constituents and history

     Keyless detail for one catalog ticker: the latest validated
    consensus with each contributing venue's index price, derived
    change and range, the optional `live` overlay, and recorded
    15-minute history over `window` (24 hours or 7 days, oldest
    first). Same methodology and caveats as the catalog. A ticker
    outside the catalog returns 404.

    Args:
        ticker (str):
        window (GetPublicTradfiReferenceWindow | Unset):  Default:
            GetPublicTradfiReferenceWindow.VALUE_0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | PublicMessageError | PublicTradfiReferenceDetail]
    """

    kwargs = _get_kwargs(
        ticker=ticker,
        window=window,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    ticker: str,
    *,
    client: AuthenticatedClient | Client,
    window: GetPublicTradfiReferenceWindow | Unset = GetPublicTradfiReferenceWindow.VALUE_0,
) -> Any | PublicMessageError | PublicTradfiReferenceDetail | None:
    """One TradFi reference with venue constituents and history

     Keyless detail for one catalog ticker: the latest validated
    consensus with each contributing venue's index price, derived
    change and range, the optional `live` overlay, and recorded
    15-minute history over `window` (24 hours or 7 days, oldest
    first). Same methodology and caveats as the catalog. A ticker
    outside the catalog returns 404.

    Args:
        ticker (str):
        window (GetPublicTradfiReferenceWindow | Unset):  Default:
            GetPublicTradfiReferenceWindow.VALUE_0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | PublicMessageError | PublicTradfiReferenceDetail
    """

    return (
        await asyncio_detailed(
            ticker=ticker,
            client=client,
            window=window,
        )
    ).parsed
