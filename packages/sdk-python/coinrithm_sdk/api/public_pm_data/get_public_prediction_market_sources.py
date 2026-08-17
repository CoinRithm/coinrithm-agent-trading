from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_sources_response import PublicPmSourcesResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    fiat: str | Unset = "USD",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["fiat"] = fiat

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/sources",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | Error | PublicPmSourcesResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmSourcesResponse.from_dict(response.json())

        return response_200

    if response.status_code == 429:
        response_429 = cast(Any, None)
        return response_429

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | Error | PublicPmSourcesResponse]:
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
) -> Response[Any | Error | PublicPmSourcesResponse]:
    r"""Per-venue comparison with coverage-ledger evidence

     Keyless per-venue stats, resolution evidence and the Gate-2 coverage
    ledger.

    `stats` AND `coverage` ARE COMPUTED AT DIFFERENT TIMES — do not
    reconcile them. `stats.*` is computed live while serving this request.
    `coverage.*` is a periodic BATCH snapshot stamped with
    `coverage.computedAt` (all venues share one run timestamp). So
    `stats.totalEvents >= coverage.enumeratedTotal` is the EXPECTED
    ordering, and the gap is simply what was ingested since the last ledger
    run: measured 2026-08-12 with a 48-minute-old ledger, the gap was 234
    events across 12 venues, zero for low-throughput venues and largest for
    the busiest one (Polymarket, 138). A gap in the OTHER direction —
    `coverage` exceeding `stats` — would be a real defect; that is the
    comparison worth alerting on.

    Read `coverage.completenessClass` literally: it reports what the LATEST
    catalog sweep observed (`open_sweep_exhausted` = the adapter enumerated
    the open set; `open_sweep_bounded` = it stopped at a provider page
    ceiling or volume floor; `unknown` = no recent sweep evidence). It does
    NOT assert that CoinRithm holds the venue's complete lifetime universe
    — that stronger claim is `coverage.universeVerified`, which is `false`
    for every venue until externally verified against a venue-published
    total. Do not paraphrase either field as \"complete coverage\".

    `coverage.openUniverseVerified` sits between the two and is the only
    universe claim we can currently substantiate: it is `true` where the
    OPEN set has been reconciled against a venue-supplied total
    (`openUniverseTotalBasis` says how that total was obtained). A `false`
    `universeVerified` therefore does NOT mean nothing is verified — check
    `openUniverseVerified` before concluding that.

    `anyResolutionRate` and `providerResolutionRate` share one denominator
    (closed events) but are different facts: any recorded resolution vs a
    provider-verified one. `catalogFirstSeenDay` is when CoinRithm first
    saw the catalog; `probabilityHistoryStartDay` is how far stored
    probability history actually reaches, and is null when none is held.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmSourcesResponse]
    """

    kwargs = _get_kwargs(
        fiat=fiat,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Any | Error | PublicPmSourcesResponse | None:
    r"""Per-venue comparison with coverage-ledger evidence

     Keyless per-venue stats, resolution evidence and the Gate-2 coverage
    ledger.

    `stats` AND `coverage` ARE COMPUTED AT DIFFERENT TIMES — do not
    reconcile them. `stats.*` is computed live while serving this request.
    `coverage.*` is a periodic BATCH snapshot stamped with
    `coverage.computedAt` (all venues share one run timestamp). So
    `stats.totalEvents >= coverage.enumeratedTotal` is the EXPECTED
    ordering, and the gap is simply what was ingested since the last ledger
    run: measured 2026-08-12 with a 48-minute-old ledger, the gap was 234
    events across 12 venues, zero for low-throughput venues and largest for
    the busiest one (Polymarket, 138). A gap in the OTHER direction —
    `coverage` exceeding `stats` — would be a real defect; that is the
    comparison worth alerting on.

    Read `coverage.completenessClass` literally: it reports what the LATEST
    catalog sweep observed (`open_sweep_exhausted` = the adapter enumerated
    the open set; `open_sweep_bounded` = it stopped at a provider page
    ceiling or volume floor; `unknown` = no recent sweep evidence). It does
    NOT assert that CoinRithm holds the venue's complete lifetime universe
    — that stronger claim is `coverage.universeVerified`, which is `false`
    for every venue until externally verified against a venue-published
    total. Do not paraphrase either field as \"complete coverage\".

    `coverage.openUniverseVerified` sits between the two and is the only
    universe claim we can currently substantiate: it is `true` where the
    OPEN set has been reconciled against a venue-supplied total
    (`openUniverseTotalBasis` says how that total was obtained). A `false`
    `universeVerified` therefore does NOT mean nothing is verified — check
    `openUniverseVerified` before concluding that.

    `anyResolutionRate` and `providerResolutionRate` share one denominator
    (closed events) but are different facts: any recorded resolution vs a
    provider-verified one. `catalogFirstSeenDay` is when CoinRithm first
    saw the catalog; `probabilityHistoryStartDay` is how far stored
    probability history actually reaches, and is null when none is held.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmSourcesResponse
    """

    return sync_detailed(
        client=client,
        fiat=fiat,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Response[Any | Error | PublicPmSourcesResponse]:
    r"""Per-venue comparison with coverage-ledger evidence

     Keyless per-venue stats, resolution evidence and the Gate-2 coverage
    ledger.

    `stats` AND `coverage` ARE COMPUTED AT DIFFERENT TIMES — do not
    reconcile them. `stats.*` is computed live while serving this request.
    `coverage.*` is a periodic BATCH snapshot stamped with
    `coverage.computedAt` (all venues share one run timestamp). So
    `stats.totalEvents >= coverage.enumeratedTotal` is the EXPECTED
    ordering, and the gap is simply what was ingested since the last ledger
    run: measured 2026-08-12 with a 48-minute-old ledger, the gap was 234
    events across 12 venues, zero for low-throughput venues and largest for
    the busiest one (Polymarket, 138). A gap in the OTHER direction —
    `coverage` exceeding `stats` — would be a real defect; that is the
    comparison worth alerting on.

    Read `coverage.completenessClass` literally: it reports what the LATEST
    catalog sweep observed (`open_sweep_exhausted` = the adapter enumerated
    the open set; `open_sweep_bounded` = it stopped at a provider page
    ceiling or volume floor; `unknown` = no recent sweep evidence). It does
    NOT assert that CoinRithm holds the venue's complete lifetime universe
    — that stronger claim is `coverage.universeVerified`, which is `false`
    for every venue until externally verified against a venue-published
    total. Do not paraphrase either field as \"complete coverage\".

    `coverage.openUniverseVerified` sits between the two and is the only
    universe claim we can currently substantiate: it is `true` where the
    OPEN set has been reconciled against a venue-supplied total
    (`openUniverseTotalBasis` says how that total was obtained). A `false`
    `universeVerified` therefore does NOT mean nothing is verified — check
    `openUniverseVerified` before concluding that.

    `anyResolutionRate` and `providerResolutionRate` share one denominator
    (closed events) but are different facts: any recorded resolution vs a
    provider-verified one. `catalogFirstSeenDay` is when CoinRithm first
    saw the catalog; `probabilityHistoryStartDay` is how far stored
    probability history actually reaches, and is null when none is held.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error | PublicPmSourcesResponse]
    """

    kwargs = _get_kwargs(
        fiat=fiat,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    fiat: str | Unset = "USD",
) -> Any | Error | PublicPmSourcesResponse | None:
    r"""Per-venue comparison with coverage-ledger evidence

     Keyless per-venue stats, resolution evidence and the Gate-2 coverage
    ledger.

    `stats` AND `coverage` ARE COMPUTED AT DIFFERENT TIMES — do not
    reconcile them. `stats.*` is computed live while serving this request.
    `coverage.*` is a periodic BATCH snapshot stamped with
    `coverage.computedAt` (all venues share one run timestamp). So
    `stats.totalEvents >= coverage.enumeratedTotal` is the EXPECTED
    ordering, and the gap is simply what was ingested since the last ledger
    run: measured 2026-08-12 with a 48-minute-old ledger, the gap was 234
    events across 12 venues, zero for low-throughput venues and largest for
    the busiest one (Polymarket, 138). A gap in the OTHER direction —
    `coverage` exceeding `stats` — would be a real defect; that is the
    comparison worth alerting on.

    Read `coverage.completenessClass` literally: it reports what the LATEST
    catalog sweep observed (`open_sweep_exhausted` = the adapter enumerated
    the open set; `open_sweep_bounded` = it stopped at a provider page
    ceiling or volume floor; `unknown` = no recent sweep evidence). It does
    NOT assert that CoinRithm holds the venue's complete lifetime universe
    — that stronger claim is `coverage.universeVerified`, which is `false`
    for every venue until externally verified against a venue-published
    total. Do not paraphrase either field as \"complete coverage\".

    `coverage.openUniverseVerified` sits between the two and is the only
    universe claim we can currently substantiate: it is `true` where the
    OPEN set has been reconciled against a venue-supplied total
    (`openUniverseTotalBasis` says how that total was obtained). A `false`
    `universeVerified` therefore does NOT mean nothing is verified — check
    `openUniverseVerified` before concluding that.

    `anyResolutionRate` and `providerResolutionRate` share one denominator
    (closed events) but are different facts: any recorded resolution vs a
    provider-verified one. `catalogFirstSeenDay` is when CoinRithm first
    saw the catalog; `probabilityHistoryStartDay` is how far stored
    probability history actually reaches, and is null when none is held.

    Args:
        fiat (str | Unset):  Default: 'USD'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error | PublicPmSourcesResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            fiat=fiat,
        )
    ).parsed
