from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.futures_position_envelope import FuturesPositionEnvelope
from ...models.set_futures_sl_tp_body import SetFuturesSlTpBody
from ...models.set_futures_sl_tp_response_422 import SetFuturesSlTpResponse422
from ...types import Response


def _get_kwargs(
    *,
    body: SetFuturesSlTpBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/agent/futures/sl-tp",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422 | None:
    if response.status_code == 200:
        response_200 = FuturesPositionEnvelope.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 409:
        response_409 = Error.from_dict(response.json())

        return response_409

    if response.status_code == 422:
        response_422 = SetFuturesSlTpResponse422.from_dict(response.json())

        return response_422

    if response.status_code == 429:
        response_429 = Error.from_dict(response.json())

        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: SetFuturesSlTpBody,
) -> Response[Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422]:
    """Set or clear resting stop-loss / take-profit on an open position

     Requires scope `trade:futures`. Provide `stopLossPrice` and/or
    `takeProfitPrice`: a positive number SETS that trigger (validated
    side-aware against the CURRENT mark and the position's liquidation
    price — long: liq < SL < mark < TP; short inverted), explicit `null`
    CLEARS it, an omitted field is left unchanged. Naturally idempotent —
    no idempotencyKey needed.

    Triggers are fired by the per-minute worker off the same mark feed as
    liquidation (liquidation always takes precedence). A fire closes the
    FULL position at mark with realized PnL (exitReason `stop_loss` /
    `take_profit`) — discover fills between polls via
    `GET /trades?updatedSince=...`.

    Args:
        body (SetFuturesSlTpBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    body: SetFuturesSlTpBody,
) -> Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422 | None:
    """Set or clear resting stop-loss / take-profit on an open position

     Requires scope `trade:futures`. Provide `stopLossPrice` and/or
    `takeProfitPrice`: a positive number SETS that trigger (validated
    side-aware against the CURRENT mark and the position's liquidation
    price — long: liq < SL < mark < TP; short inverted), explicit `null`
    CLEARS it, an omitted field is left unchanged. Naturally idempotent —
    no idempotencyKey needed.

    Triggers are fired by the per-minute worker off the same mark feed as
    liquidation (liquidation always takes precedence). A fire closes the
    FULL position at mark with realized PnL (exitReason `stop_loss` /
    `take_profit`) — discover fills between polls via
    `GET /trades?updatedSince=...`.

    Args:
        body (SetFuturesSlTpBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: SetFuturesSlTpBody,
) -> Response[Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422]:
    """Set or clear resting stop-loss / take-profit on an open position

     Requires scope `trade:futures`. Provide `stopLossPrice` and/or
    `takeProfitPrice`: a positive number SETS that trigger (validated
    side-aware against the CURRENT mark and the position's liquidation
    price — long: liq < SL < mark < TP; short inverted), explicit `null`
    CLEARS it, an omitted field is left unchanged. Naturally idempotent —
    no idempotencyKey needed.

    Triggers are fired by the per-minute worker off the same mark feed as
    liquidation (liquidation always takes precedence). A fire closes the
    FULL position at mark with realized PnL (exitReason `stop_loss` /
    `take_profit`) — discover fills between polls via
    `GET /trades?updatedSince=...`.

    Args:
        body (SetFuturesSlTpBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: SetFuturesSlTpBody,
) -> Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422 | None:
    """Set or clear resting stop-loss / take-profit on an open position

     Requires scope `trade:futures`. Provide `stopLossPrice` and/or
    `takeProfitPrice`: a positive number SETS that trigger (validated
    side-aware against the CURRENT mark and the position's liquidation
    price — long: liq < SL < mark < TP; short inverted), explicit `null`
    CLEARS it, an omitted field is left unchanged. Naturally idempotent —
    no idempotencyKey needed.

    Triggers are fired by the per-minute worker off the same mark feed as
    liquidation (liquidation always takes precedence). A fire closes the
    FULL position at mark with realized PnL (exitReason `stop_loss` /
    `take_profit`) — discover fills between polls via
    `GET /trades?updatedSince=...`.

    Args:
        body (SetFuturesSlTpBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | FuturesPositionEnvelope | SetFuturesSlTpResponse422
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
