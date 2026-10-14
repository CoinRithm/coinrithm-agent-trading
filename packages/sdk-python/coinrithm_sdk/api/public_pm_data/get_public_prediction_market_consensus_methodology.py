from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_public_prediction_market_consensus_methodology_response_200 import (
    GetPublicPredictionMarketConsensusMethodologyResponse200,
)
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/consensus-methodology",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> GetPublicPredictionMarketConsensusMethodologyResponse200 | None:
    if response.status_code == 200:
        response_200 = GetPublicPredictionMarketConsensusMethodologyResponse200.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[GetPublicPredictionMarketConsensusMethodologyResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[GetPublicPredictionMarketConsensusMethodologyResponse200]:
    """The versioned methodology behind Consensus Probability

     Keyless, DB-free disclosure of exactly how the cross-venue Consensus
    Probability is computed: venue eligibility, one-voice-per-venue
    weighting, the size-capped weighted MEDIAN estimator, the spread rule,
    the binary/leader kinds, and the stated limitations.

    Current version `consensus_probability_v3` (since 2026-10-14): each
    venue's weight is clamp(openInterest, 1000, 50000) when every venue in
    the comparison reports USD open interest, otherwise
    clamp(liquidity, 1000, 50000) exactly as v2. `acceptedVersions` lists
    every writer version still served (v2 and v3 during the transition);
    `previousVersions` states each earlier version's weight rule.

    Every served `referenceProbability` carries `methodologyVersion` (the
    version that ROW was written with, never relabelled) and
    `methodologyUrl`; this endpoint is what that URL resolves to. It also
    carries `weightBasis` (`open_interest` | `liquidity`; every v2 row is
    `liquidity`). Pin the version alongside any number you store — it is
    what lets you tell whether a probability you cached was produced the
    same way as today's.

    A published version's terms never change. If the computation changes,
    the version changes with it.

    Consensus Probability is CoinRithm Data — computed by CoinRithm, free to
    cite with attribution. It is NOT venue market data and carries no venue
    redistribution rights.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetPublicPredictionMarketConsensusMethodologyResponse200]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> GetPublicPredictionMarketConsensusMethodologyResponse200 | None:
    """The versioned methodology behind Consensus Probability

     Keyless, DB-free disclosure of exactly how the cross-venue Consensus
    Probability is computed: venue eligibility, one-voice-per-venue
    weighting, the size-capped weighted MEDIAN estimator, the spread rule,
    the binary/leader kinds, and the stated limitations.

    Current version `consensus_probability_v3` (since 2026-10-14): each
    venue's weight is clamp(openInterest, 1000, 50000) when every venue in
    the comparison reports USD open interest, otherwise
    clamp(liquidity, 1000, 50000) exactly as v2. `acceptedVersions` lists
    every writer version still served (v2 and v3 during the transition);
    `previousVersions` states each earlier version's weight rule.

    Every served `referenceProbability` carries `methodologyVersion` (the
    version that ROW was written with, never relabelled) and
    `methodologyUrl`; this endpoint is what that URL resolves to. It also
    carries `weightBasis` (`open_interest` | `liquidity`; every v2 row is
    `liquidity`). Pin the version alongside any number you store — it is
    what lets you tell whether a probability you cached was produced the
    same way as today's.

    A published version's terms never change. If the computation changes,
    the version changes with it.

    Consensus Probability is CoinRithm Data — computed by CoinRithm, free to
    cite with attribution. It is NOT venue market data and carries no venue
    redistribution rights.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetPublicPredictionMarketConsensusMethodologyResponse200
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[GetPublicPredictionMarketConsensusMethodologyResponse200]:
    """The versioned methodology behind Consensus Probability

     Keyless, DB-free disclosure of exactly how the cross-venue Consensus
    Probability is computed: venue eligibility, one-voice-per-venue
    weighting, the size-capped weighted MEDIAN estimator, the spread rule,
    the binary/leader kinds, and the stated limitations.

    Current version `consensus_probability_v3` (since 2026-10-14): each
    venue's weight is clamp(openInterest, 1000, 50000) when every venue in
    the comparison reports USD open interest, otherwise
    clamp(liquidity, 1000, 50000) exactly as v2. `acceptedVersions` lists
    every writer version still served (v2 and v3 during the transition);
    `previousVersions` states each earlier version's weight rule.

    Every served `referenceProbability` carries `methodologyVersion` (the
    version that ROW was written with, never relabelled) and
    `methodologyUrl`; this endpoint is what that URL resolves to. It also
    carries `weightBasis` (`open_interest` | `liquidity`; every v2 row is
    `liquidity`). Pin the version alongside any number you store — it is
    what lets you tell whether a probability you cached was produced the
    same way as today's.

    A published version's terms never change. If the computation changes,
    the version changes with it.

    Consensus Probability is CoinRithm Data — computed by CoinRithm, free to
    cite with attribution. It is NOT venue market data and carries no venue
    redistribution rights.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetPublicPredictionMarketConsensusMethodologyResponse200]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> GetPublicPredictionMarketConsensusMethodologyResponse200 | None:
    """The versioned methodology behind Consensus Probability

     Keyless, DB-free disclosure of exactly how the cross-venue Consensus
    Probability is computed: venue eligibility, one-voice-per-venue
    weighting, the size-capped weighted MEDIAN estimator, the spread rule,
    the binary/leader kinds, and the stated limitations.

    Current version `consensus_probability_v3` (since 2026-10-14): each
    venue's weight is clamp(openInterest, 1000, 50000) when every venue in
    the comparison reports USD open interest, otherwise
    clamp(liquidity, 1000, 50000) exactly as v2. `acceptedVersions` lists
    every writer version still served (v2 and v3 during the transition);
    `previousVersions` states each earlier version's weight rule.

    Every served `referenceProbability` carries `methodologyVersion` (the
    version that ROW was written with, never relabelled) and
    `methodologyUrl`; this endpoint is what that URL resolves to. It also
    carries `weightBasis` (`open_interest` | `liquidity`; every v2 row is
    `liquidity`). Pin the version alongside any number you store — it is
    what lets you tell whether a probability you cached was produced the
    same way as today's.

    A published version's terms never change. If the computation changes,
    the version changes with it.

    Consensus Probability is CoinRithm Data — computed by CoinRithm, free to
    cite with attribution. It is NOT venue market data and carries no venue
    redistribution rights.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetPublicPredictionMarketConsensusMethodologyResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
