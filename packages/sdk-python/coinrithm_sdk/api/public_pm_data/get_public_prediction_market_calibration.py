from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.public_pm_calibration_response import PublicPmCalibrationResponse
from ...types import Response


def _get_kwargs() -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/prediction-markets/calibration",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PublicPmCalibrationResponse | None:
    if response.status_code == 200:
        response_200 = PublicPmCalibrationResponse.from_dict(response.json())

        return response_200

    if response.status_code == 500:
        response_500 = Error.from_dict(response.json())

        return response_500

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PublicPmCalibrationResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmCalibrationResponse]:
    """Per-venue forecast-accuracy calibration

     Keyless per-source calibration (Expected Calibration Error + reliability
    curve) computed from each venue's own probability ~24h before
    resolution against the realised outcome, over resolved markets with
    >=24h of pre-resolution history. Venues below the minimum sample appear
    in `pending`, not `scored`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmCalibrationResponse]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmCalibrationResponse | None:
    """Per-venue forecast-accuracy calibration

     Keyless per-source calibration (Expected Calibration Error + reliability
    curve) computed from each venue's own probability ~24h before
    resolution against the realised outcome, over resolved markets with
    >=24h of pre-resolution history. Venues below the minimum sample appear
    in `pending`, not `scored`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmCalibrationResponse
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | PublicPmCalibrationResponse]:
    """Per-venue forecast-accuracy calibration

     Keyless per-source calibration (Expected Calibration Error + reliability
    curve) computed from each venue's own probability ~24h before
    resolution against the realised outcome, over resolved markets with
    >=24h of pre-resolution history. Venues below the minimum sample appear
    in `pending`, not `scored`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PublicPmCalibrationResponse]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
) -> Error | PublicPmCalibrationResponse | None:
    """Per-venue forecast-accuracy calibration

     Keyless per-source calibration (Expected Calibration Error + reliability
    curve) computed from each venue's own probability ~24h before
    resolution against the realised outcome, over resolved markets with
    >=24h of pre-resolution history. Venues below the minimum sample appear
    in `pending`, not `scored`.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PublicPmCalibrationResponse
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
