from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_events_response import PublicPmEventsResponse
from ...models.public_pm_source_slug import PublicPmSourceSlug
from ...models.search_public_prediction_market_events_dedupe import SearchPublicPredictionMarketEventsDedupe
from ...models.search_public_prediction_market_events_include_quote_evidence import (
    SearchPublicPredictionMarketEventsIncludeQuoteEvidence,
)
from ...models.search_public_prediction_market_events_lead import SearchPublicPredictionMarketEventsLead
from ...models.search_public_prediction_market_events_sort import SearchPublicPredictionMarketEventsSort
from ...models.search_public_prediction_market_events_view import SearchPublicPredictionMarketEventsView
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    tag: str | Unset = UNSET,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    sort: SearchPublicPredictionMarketEventsSort | Unset = SearchPublicPredictionMarketEventsSort.BEST,
    tradeable: bool | Unset = False,
    fiat: str | Unset = "USD",
    view: SearchPublicPredictionMarketEventsView | Unset = UNSET,
    lead: SearchPublicPredictionMarketEventsLead | Unset = UNSET,
    dedupe: SearchPublicPredictionMarketEventsDedupe | Unset = UNSET,
    min_volume_24_h: float | Unset = UNSET,
    include_quote_evidence: SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["offset"] = offset

    params["q"] = q

    params["tag"] = tag

    params["status"] = status

    json_source: str | Unset = UNSET
    if not isinstance(source, Unset):
        json_source = source.value

    params["source"] = json_source

    json_sort: str | Unset = UNSET
    if not isinstance(sort, Unset):
        json_sort = sort.value

    params["sort"] = json_sort

    params["tradeable"] = tradeable

    params["fiat"] = fiat

    json_view: str | Unset = UNSET
    if not isinstance(view, Unset):
        json_view = view.value

    params["view"] = json_view

    json_lead: str | Unset = UNSET
    if not isinstance(lead, Unset):
        json_lead = lead.value

    params["lead"] = json_lead

    json_dedupe: str | Unset = UNSET
    if not isinstance(dedupe, Unset):
        json_dedupe = dedupe.value

    params["dedupe"] = json_dedupe

    params["minVolume24h"] = min_volume_24_h

    json_include_quote_evidence: str | Unset = UNSET
    if not isinstance(include_quote_evidence, Unset):
        json_include_quote_evidence = include_quote_evidence.value

    params["includeQuoteEvidence"] = json_include_quote_evidence

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/events",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmEventsResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmEventsResponse.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = Error.from_dict(response.json())

        return response_400

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmEventsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    tag: str | Unset = UNSET,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    sort: SearchPublicPredictionMarketEventsSort | Unset = SearchPublicPredictionMarketEventsSort.BEST,
    tradeable: bool | Unset = False,
    fiat: str | Unset = "USD",
    view: SearchPublicPredictionMarketEventsView | Unset = UNSET,
    lead: SearchPublicPredictionMarketEventsLead | Unset = UNSET,
    dedupe: SearchPublicPredictionMarketEventsDedupe | Unset = UNSET,
    min_volume_24_h: float | Unset = UNSET,
    include_quote_evidence: SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset = UNSET,
) -> Response[Error | PublicPmEventsResponse]:
    """Search events across all prediction-market venues

     Keyless event search across Polymarket, Kalshi, Rothera, Limitless,
    Smarkets, Manifold, Metaculus, PredictIt, Futuur, Myriad, ForecastEx
    and Gemini. Results remain visible when quality-blocked; inspect
    `quality` and `decisionSupport` before using a row for a decision. This
    research endpoint is broader than the authenticated paper-trading
    discovery API.

    Open events of a venue CoinRithm has paused (no longer collecting) are
    left out of this list, the overview, expiring and matches surfaces;
    their closed and resolved history stays available. `pagination` reports
    `limit`, `offset` and `hasMore`.

    Opt-ins (absent means the default shape): `view=compact` keeps each
    event's top 3 outcomes by probability, adds `outcomesTotal` and drops
    `description`; `lead=representative` (with `view=compact` only) adds
    `representativeOutcome` on open events; `dedupe=matched` keeps only the
    highest-ranked member of each approved cross-venue match group on the
    page (a page can then hold fewer than `limit` rows); `minVolume24h`
    keeps events with at least that 24h USD volume;
    `includeQuoteEvidence=1` adds `quoteEvidence` to every outcome.

    An unknown query parameter returns `400` with a message naming the
    supported parameters.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        tag (str | Unset):
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        sort (SearchPublicPredictionMarketEventsSort | Unset):  Default:
            SearchPublicPredictionMarketEventsSort.BEST.
        tradeable (bool | Unset):  Default: False.
        fiat (str | Unset):  Default: 'USD'.
        view (SearchPublicPredictionMarketEventsView | Unset):
        lead (SearchPublicPredictionMarketEventsLead | Unset):
        dedupe (SearchPublicPredictionMarketEventsDedupe | Unset):
        min_volume_24_h (float | Unset):
        include_quote_evidence (SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        q=q,
        tag=tag,
        status=status,
        source=source,
        sort=sort,
        tradeable=tradeable,
        fiat=fiat,
        view=view,
        lead=lead,
        dedupe=dedupe,
        min_volume_24_h=min_volume_24_h,
        include_quote_evidence=include_quote_evidence,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    tag: str | Unset = UNSET,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    sort: SearchPublicPredictionMarketEventsSort | Unset = SearchPublicPredictionMarketEventsSort.BEST,
    tradeable: bool | Unset = False,
    fiat: str | Unset = "USD",
    view: SearchPublicPredictionMarketEventsView | Unset = UNSET,
    lead: SearchPublicPredictionMarketEventsLead | Unset = UNSET,
    dedupe: SearchPublicPredictionMarketEventsDedupe | Unset = UNSET,
    min_volume_24_h: float | Unset = UNSET,
    include_quote_evidence: SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset = UNSET,
) -> Error | PublicPmEventsResponse | None:
    """Search events across all prediction-market venues

     Keyless event search across Polymarket, Kalshi, Rothera, Limitless,
    Smarkets, Manifold, Metaculus, PredictIt, Futuur, Myriad, ForecastEx
    and Gemini. Results remain visible when quality-blocked; inspect
    `quality` and `decisionSupport` before using a row for a decision. This
    research endpoint is broader than the authenticated paper-trading
    discovery API.

    Open events of a venue CoinRithm has paused (no longer collecting) are
    left out of this list, the overview, expiring and matches surfaces;
    their closed and resolved history stays available. `pagination` reports
    `limit`, `offset` and `hasMore`.

    Opt-ins (absent means the default shape): `view=compact` keeps each
    event's top 3 outcomes by probability, adds `outcomesTotal` and drops
    `description`; `lead=representative` (with `view=compact` only) adds
    `representativeOutcome` on open events; `dedupe=matched` keeps only the
    highest-ranked member of each approved cross-venue match group on the
    page (a page can then hold fewer than `limit` rows); `minVolume24h`
    keeps events with at least that 24h USD volume;
    `includeQuoteEvidence=1` adds `quoteEvidence` to every outcome.

    An unknown query parameter returns `400` with a message naming the
    supported parameters.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        tag (str | Unset):
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        sort (SearchPublicPredictionMarketEventsSort | Unset):  Default:
            SearchPublicPredictionMarketEventsSort.BEST.
        tradeable (bool | Unset):  Default: False.
        fiat (str | Unset):  Default: 'USD'.
        view (SearchPublicPredictionMarketEventsView | Unset):
        lead (SearchPublicPredictionMarketEventsLead | Unset):
        dedupe (SearchPublicPredictionMarketEventsDedupe | Unset):
        min_volume_24_h (float | Unset):
        include_quote_evidence (SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventsResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        offset=offset,
        q=q,
        tag=tag,
        status=status,
        source=source,
        sort=sort,
        tradeable=tradeable,
        fiat=fiat,
        view=view,
        lead=lead,
        dedupe=dedupe,
        min_volume_24_h=min_volume_24_h,
        include_quote_evidence=include_quote_evidence,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    tag: str | Unset = UNSET,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    sort: SearchPublicPredictionMarketEventsSort | Unset = SearchPublicPredictionMarketEventsSort.BEST,
    tradeable: bool | Unset = False,
    fiat: str | Unset = "USD",
    view: SearchPublicPredictionMarketEventsView | Unset = UNSET,
    lead: SearchPublicPredictionMarketEventsLead | Unset = UNSET,
    dedupe: SearchPublicPredictionMarketEventsDedupe | Unset = UNSET,
    min_volume_24_h: float | Unset = UNSET,
    include_quote_evidence: SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset = UNSET,
) -> Response[Error | PublicPmEventsResponse]:
    """Search events across all prediction-market venues

     Keyless event search across Polymarket, Kalshi, Rothera, Limitless,
    Smarkets, Manifold, Metaculus, PredictIt, Futuur, Myriad, ForecastEx
    and Gemini. Results remain visible when quality-blocked; inspect
    `quality` and `decisionSupport` before using a row for a decision. This
    research endpoint is broader than the authenticated paper-trading
    discovery API.

    Open events of a venue CoinRithm has paused (no longer collecting) are
    left out of this list, the overview, expiring and matches surfaces;
    their closed and resolved history stays available. `pagination` reports
    `limit`, `offset` and `hasMore`.

    Opt-ins (absent means the default shape): `view=compact` keeps each
    event's top 3 outcomes by probability, adds `outcomesTotal` and drops
    `description`; `lead=representative` (with `view=compact` only) adds
    `representativeOutcome` on open events; `dedupe=matched` keeps only the
    highest-ranked member of each approved cross-venue match group on the
    page (a page can then hold fewer than `limit` rows); `minVolume24h`
    keeps events with at least that 24h USD volume;
    `includeQuoteEvidence=1` adds `quoteEvidence` to every outcome.

    An unknown query parameter returns `400` with a message naming the
    supported parameters.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        tag (str | Unset):
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        sort (SearchPublicPredictionMarketEventsSort | Unset):  Default:
            SearchPublicPredictionMarketEventsSort.BEST.
        tradeable (bool | Unset):  Default: False.
        fiat (str | Unset):  Default: 'USD'.
        view (SearchPublicPredictionMarketEventsView | Unset):
        lead (SearchPublicPredictionMarketEventsLead | Unset):
        dedupe (SearchPublicPredictionMarketEventsDedupe | Unset):
        min_volume_24_h (float | Unset):
        include_quote_evidence (SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmEventsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        offset=offset,
        q=q,
        tag=tag,
        status=status,
        source=source,
        sort=sort,
        tradeable=tradeable,
        fiat=fiat,
        view=view,
        lead=lead,
        dedupe=dedupe,
        min_volume_24_h=min_volume_24_h,
        include_quote_evidence=include_quote_evidence,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: int | Unset = 20,
    offset: int | Unset = 0,
    q: str | Unset = UNSET,
    tag: str | Unset = UNSET,
    status: str | Unset = "open",
    source: PublicPmSourceSlug | Unset = UNSET,
    sort: SearchPublicPredictionMarketEventsSort | Unset = SearchPublicPredictionMarketEventsSort.BEST,
    tradeable: bool | Unset = False,
    fiat: str | Unset = "USD",
    view: SearchPublicPredictionMarketEventsView | Unset = UNSET,
    lead: SearchPublicPredictionMarketEventsLead | Unset = UNSET,
    dedupe: SearchPublicPredictionMarketEventsDedupe | Unset = UNSET,
    min_volume_24_h: float | Unset = UNSET,
    include_quote_evidence: SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset = UNSET,
) -> Error | PublicPmEventsResponse | None:
    """Search events across all prediction-market venues

     Keyless event search across Polymarket, Kalshi, Rothera, Limitless,
    Smarkets, Manifold, Metaculus, PredictIt, Futuur, Myriad, ForecastEx
    and Gemini. Results remain visible when quality-blocked; inspect
    `quality` and `decisionSupport` before using a row for a decision. This
    research endpoint is broader than the authenticated paper-trading
    discovery API.

    Open events of a venue CoinRithm has paused (no longer collecting) are
    left out of this list, the overview, expiring and matches surfaces;
    their closed and resolved history stays available. `pagination` reports
    `limit`, `offset` and `hasMore`.

    Opt-ins (absent means the default shape): `view=compact` keeps each
    event's top 3 outcomes by probability, adds `outcomesTotal` and drops
    `description`; `lead=representative` (with `view=compact` only) adds
    `representativeOutcome` on open events; `dedupe=matched` keeps only the
    highest-ranked member of each approved cross-venue match group on the
    page (a page can then hold fewer than `limit` rows); `minVolume24h`
    keeps events with at least that 24h USD volume;
    `includeQuoteEvidence=1` adds `quoteEvidence` to every outcome.

    An unknown query parameter returns `400` with a message naming the
    supported parameters.

    Args:
        limit (int | Unset):  Default: 20.
        offset (int | Unset):  Default: 0.
        q (str | Unset):
        tag (str | Unset):
        status (str | Unset):  Default: 'open'.
        source (PublicPmSourceSlug | Unset):
        sort (SearchPublicPredictionMarketEventsSort | Unset):  Default:
            SearchPublicPredictionMarketEventsSort.BEST.
        tradeable (bool | Unset):  Default: False.
        fiat (str | Unset):  Default: 'USD'.
        view (SearchPublicPredictionMarketEventsView | Unset):
        lead (SearchPublicPredictionMarketEventsLead | Unset):
        dedupe (SearchPublicPredictionMarketEventsDedupe | Unset):
        min_volume_24_h (float | Unset):
        include_quote_evidence (SearchPublicPredictionMarketEventsIncludeQuoteEvidence | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmEventsResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            offset=offset,
            q=q,
            tag=tag,
            status=status,
            source=source,
            sort=sort,
            tradeable=tradeable,
            fiat=fiat,
            view=view,
            lead=lead,
            dedupe=dedupe,
            min_volume_24_h=min_volume_24_h,
            include_quote_evidence=include_quote_evidence,
        )
    ).parsed
