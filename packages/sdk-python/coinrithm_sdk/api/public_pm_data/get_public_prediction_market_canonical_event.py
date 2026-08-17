from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_canonical_detail_response import PublicPmCanonicalDetailResponse
from ...types import Response


def _get_kwargs(
    key: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/canonical/{key}".format(
            key=quote(str(key), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmCanonicalDetailResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmCanonicalDetailResponse.from_dict(response.json())

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
) -> Response[Error | PublicPmCanonicalDetailResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    key: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmCanonicalDetailResponse]:
    """Get one canonical event's members and judgment lineage

     Keyless canonical-event detail by UUID or slug: venue members with
    orientation (same/flipped/unknown — never price-inferred), confidence
    and provenance basis, plus an append-only judgment lineage. A MERGED
    canonical still resolves (status='merged' + mergedInto pointer) so a
    stable key never 404s.

    Full specification — identifier permanence, orientation semantics, the
    adoption steps, and what is deliberately NOT guaranteed:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    `orientation: flipped` means the member is stated BACKWARDS relative to
    the anchor: read its probability as 100 - p before comparing. `unknown`
    means not yet judged and is served as-is — never collapse it to `same`,
    which is the silent error this field exists to prevent. `title` is a
    snapshot taken at creation and is never refreshed; read
    members[].eventTitle for current venue wording.

    Args:
        key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmCanonicalDetailResponse]
    """

    kwargs = _get_kwargs(
        key=key,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    key: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmCanonicalDetailResponse | None:
    """Get one canonical event's members and judgment lineage

     Keyless canonical-event detail by UUID or slug: venue members with
    orientation (same/flipped/unknown — never price-inferred), confidence
    and provenance basis, plus an append-only judgment lineage. A MERGED
    canonical still resolves (status='merged' + mergedInto pointer) so a
    stable key never 404s.

    Full specification — identifier permanence, orientation semantics, the
    adoption steps, and what is deliberately NOT guaranteed:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    `orientation: flipped` means the member is stated BACKWARDS relative to
    the anchor: read its probability as 100 - p before comparing. `unknown`
    means not yet judged and is served as-is — never collapse it to `same`,
    which is the silent error this field exists to prevent. `title` is a
    snapshot taken at creation and is never refreshed; read
    members[].eventTitle for current venue wording.

    Args:
        key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmCanonicalDetailResponse
    """

    return sync_detailed(
        key=key,
        client=client,
    ).parsed


async def asyncio_detailed(
    key: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmCanonicalDetailResponse]:
    """Get one canonical event's members and judgment lineage

     Keyless canonical-event detail by UUID or slug: venue members with
    orientation (same/flipped/unknown — never price-inferred), confidence
    and provenance basis, plus an append-only judgment lineage. A MERGED
    canonical still resolves (status='merged' + mergedInto pointer) so a
    stable key never 404s.

    Full specification — identifier permanence, orientation semantics, the
    adoption steps, and what is deliberately NOT guaranteed:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    `orientation: flipped` means the member is stated BACKWARDS relative to
    the anchor: read its probability as 100 - p before comparing. `unknown`
    means not yet judged and is served as-is — never collapse it to `same`,
    which is the silent error this field exists to prevent. `title` is a
    snapshot taken at creation and is never refreshed; read
    members[].eventTitle for current venue wording.

    Args:
        key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmCanonicalDetailResponse]
    """

    kwargs = _get_kwargs(
        key=key,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    key: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmCanonicalDetailResponse | None:
    """Get one canonical event's members and judgment lineage

     Keyless canonical-event detail by UUID or slug: venue members with
    orientation (same/flipped/unknown — never price-inferred), confidence
    and provenance basis, plus an append-only judgment lineage. A MERGED
    canonical still resolves (status='merged' + mergedInto pointer) so a
    stable key never 404s.

    Full specification — identifier permanence, orientation semantics, the
    adoption steps, and what is deliberately NOT guaranteed:
    https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/EVENT_ID_STANDARD.md

    `orientation: flipped` means the member is stated BACKWARDS relative to
    the anchor: read its probability as 100 - p before comparing. `unknown`
    means not yet judged and is served as-is — never collapse it to `same`,
    which is the silent error this field exists to prevent. `title` is a
    snapshot taken at creation and is never refreshed; read
    members[].eventTitle for current venue wording.

    Args:
        key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmCanonicalDetailResponse
    """

    return (
        await asyncio_detailed(
            key=key,
            client=client,
        )
    ).parsed
