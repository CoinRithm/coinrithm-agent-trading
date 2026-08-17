from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.agent_portfolio import AgentPortfolio
from ...models.error import Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["fiat"] = fiat

    params["locale"] = locale

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/agent/portfolio",
        "params": params,
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> AgentPortfolio | Error | None:
    if response.status_code == 200:
        response_200 = AgentPortfolio.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AgentPortfolio | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> Response[AgentPortfolio | Error]:
    """Portfolio — equity, PnL, open orders, progression

     Lean, PII-free account summary (the agent surface does NOT return the
    human dashboard — no email/username/assets/history). Equity is
    `equity.totalUsd`; cash partitions under `equity` (available + frozen +
    frozenPm + frozenFutures = `equity.cashTotal`); period PnL under `pnl`
    (`*Usd` absolute, `*Pct` as 0..1 fractions). Requires scope `read`.

    Args:
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentPortfolio | Error]
    """

    kwargs = _get_kwargs(
        fiat=fiat,
        locale=locale,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> AgentPortfolio | Error | None:
    """Portfolio — equity, PnL, open orders, progression

     Lean, PII-free account summary (the agent surface does NOT return the
    human dashboard — no email/username/assets/history). Equity is
    `equity.totalUsd`; cash partitions under `equity` (available + frozen +
    frozenPm + frozenFutures = `equity.cashTotal`); period PnL under `pnl`
    (`*Usd` absolute, `*Pct` as 0..1 fractions). Requires scope `read`.

    Args:
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentPortfolio | Error
    """

    return sync_detailed(
        client=client,
        fiat=fiat,
        locale=locale,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> Response[AgentPortfolio | Error]:
    """Portfolio — equity, PnL, open orders, progression

     Lean, PII-free account summary (the agent surface does NOT return the
    human dashboard — no email/username/assets/history). Equity is
    `equity.totalUsd`; cash partitions under `equity` (available + frozen +
    frozenPm + frozenFutures = `equity.cashTotal`); period PnL under `pnl`
    (`*Usd` absolute, `*Pct` as 0..1 fractions). Requires scope `read`.

    Args:
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AgentPortfolio | Error]
    """

    kwargs = _get_kwargs(
        fiat=fiat,
        locale=locale,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
    locale: str | Unset = "en",
) -> AgentPortfolio | Error | None:
    """Portfolio — equity, PnL, open orders, progression

     Lean, PII-free account summary (the agent surface does NOT return the
    human dashboard — no email/username/assets/history). Equity is
    `equity.totalUsd`; cash partitions under `equity` (available + frozen +
    frozenPm + frozenFutures = `equity.cashTotal`); period PnL under `pnl`
    (`*Usd` absolute, `*Pct` as 0..1 fractions). Requires scope `read`.

    Args:
        fiat (str | Unset):  Default: 'USD'.
        locale (str | Unset):  Default: 'en'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AgentPortfolio | Error
    """

    return (
        await asyncio_detailed(
            client=client,
            fiat=fiat,
            locale=locale,
        )
    ).parsed
