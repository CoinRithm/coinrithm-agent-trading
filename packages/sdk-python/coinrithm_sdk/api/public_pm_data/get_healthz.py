from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_healthz_response_200 import GetHealthzResponse200
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/healthz",
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> GetHealthzResponse200 | None:
    if response.status_code == 200:
        response_200 = GetHealthzResponse200(response.text)

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[GetHealthzResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[GetHealthzResponse200]:
    """Liveness probe

     Plain-text liveness check. Returns HTTP 200 with the body `ok` when the
    API process is serving. Keyless, unrated, and intentionally trivial —
    poll it as often as your monitoring needs.

    It answers exactly one question: is the process up. It does NOT assert
    that the database is reachable, that ingestion is current, or that any
    venue is fresh. Deep checks are deliberately localhost-only, because
    exposing dependency topology publicly is a gift to an attacker.

    For DATA freshness rather than process liveness, poll
    `/api/prediction-markets/sources/health`, which reports per-venue ingest
    lag, freshness tier against a published SLO, and degraded flags.

    NOTE: CoinRithm publishes no uptime SLA today, and this endpoint is not
    one. See the repository's status notes for why an SLA has not been
    offered yet.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetHealthzResponse200]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> GetHealthzResponse200 | None:
    """Liveness probe

     Plain-text liveness check. Returns HTTP 200 with the body `ok` when the
    API process is serving. Keyless, unrated, and intentionally trivial —
    poll it as often as your monitoring needs.

    It answers exactly one question: is the process up. It does NOT assert
    that the database is reachable, that ingestion is current, or that any
    venue is fresh. Deep checks are deliberately localhost-only, because
    exposing dependency topology publicly is a gift to an attacker.

    For DATA freshness rather than process liveness, poll
    `/api/prediction-markets/sources/health`, which reports per-venue ingest
    lag, freshness tier against a published SLO, and degraded flags.

    NOTE: CoinRithm publishes no uptime SLA today, and this endpoint is not
    one. See the repository's status notes for why an SLA has not been
    offered yet.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetHealthzResponse200
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[GetHealthzResponse200]:
    """Liveness probe

     Plain-text liveness check. Returns HTTP 200 with the body `ok` when the
    API process is serving. Keyless, unrated, and intentionally trivial —
    poll it as often as your monitoring needs.

    It answers exactly one question: is the process up. It does NOT assert
    that the database is reachable, that ingestion is current, or that any
    venue is fresh. Deep checks are deliberately localhost-only, because
    exposing dependency topology publicly is a gift to an attacker.

    For DATA freshness rather than process liveness, poll
    `/api/prediction-markets/sources/health`, which reports per-venue ingest
    lag, freshness tier against a published SLO, and degraded flags.

    NOTE: CoinRithm publishes no uptime SLA today, and this endpoint is not
    one. See the repository's status notes for why an SLA has not been
    offered yet.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetHealthzResponse200]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> GetHealthzResponse200 | None:
    """Liveness probe

     Plain-text liveness check. Returns HTTP 200 with the body `ok` when the
    API process is serving. Keyless, unrated, and intentionally trivial —
    poll it as often as your monitoring needs.

    It answers exactly one question: is the process up. It does NOT assert
    that the database is reachable, that ingestion is current, or that any
    venue is fresh. Deep checks are deliberately localhost-only, because
    exposing dependency topology publicly is a gift to an attacker.

    For DATA freshness rather than process liveness, poll
    `/api/prediction-markets/sources/health`, which reports per-venue ingest
    lag, freshness tier against a published SLO, and degraded flags.

    NOTE: CoinRithm publishes no uptime SLA today, and this endpoint is not
    one. See the repository's status notes for why an SLA has not been
    offered yet.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetHealthzResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
