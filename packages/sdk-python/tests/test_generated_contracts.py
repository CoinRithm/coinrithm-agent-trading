"""Exercise generated wire contracts with deterministic, entirely offline fixtures.

Every model is checked with absent, nullable and populated optional values.
This complements the explicit real-contract examples in test_client.py; it
detects lossy serialization and failures in rarely used generated models.
"""

import asyncio
import datetime
import importlib
import inspect
import pkgutil
import types
import typing
import uuid
from enum import Enum

import attrs
import httpx
import pytest

import coinrithm_sdk.api
import coinrithm_sdk.models
from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.errors import UnexpectedStatus
from coinrithm_sdk.models import PublicPmOutcome, PublicPmOutcomeVenueTerms
from coinrithm_sdk.types import UNSET, Unset

MODEL_MODULES = [
    importlib.import_module(module.name)
    for module in pkgutil.iter_modules(coinrithm_sdk.models.__path__, prefix="coinrithm_sdk.models.")
]
CLASSES = {
    name: value
    for module in MODEL_MODULES
    for name, value in vars(module).items()
    if isinstance(value, type) and value.__module__ == module.__name__
}
MODELS = sorted((cls for cls in CLASSES.values() if attrs.has(cls)), key=lambda cls: cls.__name__)
ENUMS = sorted((cls for cls in CLASSES.values() if issubclass(cls, Enum)), key=lambda cls: cls.__name__)


def hints(cls):
    module = importlib.import_module(cls.__module__)
    return typing.get_type_hints(cls, globalns={**vars(module), **CLASSES})


def sample(annotation, variant=2, depth=0):
    origin = typing.get_origin(annotation)
    arguments = typing.get_args(annotation)
    if origin is typing.Literal:
        return arguments[variant % len(arguments)]
    if origin in (types.UnionType, typing.Union):
        if Unset in arguments and (variant == 0 or depth > 6):
            return UNSET
        if type(None) in arguments and variant == 1:
            return None
        values = [arg for arg in arguments if arg not in (Unset, type(None))]
        return sample(values[(max(2, variant) - 2) % len(values)], variant, depth)
    if annotation is type(None):
        return None
    if annotation is Unset:
        return UNSET
    if annotation is typing.Any:
        return {"fixture": "preserved", "number": 7}
    if origin is list:
        return [] if variant < 2 else [sample(arguments[0], variant, depth + 1)]
    if origin is dict:
        return {} if variant < 2 else {"fixture-key": sample(arguments[1], variant, depth + 1)}
    if annotation is str:
        return "fixture-value"
    if annotation is bool:
        return variant % 2 == 0
    if annotation is int:
        return 7
    if annotation is float:
        return 0.75
    if annotation is datetime.datetime:
        return datetime.datetime(2026, 9, 15, 0, 0, tzinfo=datetime.timezone.utc)
    if annotation is datetime.date:
        return datetime.date(2026, 9, 15)
    if annotation is uuid.UUID:
        return uuid.UUID("00000000-0000-4000-8000-000000000001")
    if isinstance(annotation, type) and issubclass(annotation, Enum):
        return list(annotation)[variant % len(annotation)]
    if attrs.has(annotation):
        annotations = hints(annotation)
        return annotation(
            **{
                field.alias: sample(annotations[field.name], variant, depth + 1)
                for field in attrs.fields(annotation)
                if field.init
            }
        )
    raise AssertionError(f"Add a representative fixture for {annotation!r}")


@pytest.mark.parametrize("model", MODELS, ids=lambda cls: cls.__name__)
@pytest.mark.parametrize(
    "variant", range(5), ids=["absent", "nullable", "populated", "alternative", "second-alternative"]
)
def test_generated_model_preserves_wire_values_and_unknown_fields(model, variant):
    original = sample(model, variant)
    extensible = hasattr(original, "additional_properties")
    if extensible:
        extra_type = typing.get_args(hints(model)["additional_properties"])[1]
        extra_value = sample(extra_type, variant)
        original["futureField"] = extra_value
        assert "futureField" in original
        assert original["futureField"] == extra_value
        assert "futureField" in original.additional_keys
    payload = original.to_dict()
    restored = model.from_dict(payload)
    assert restored.to_dict() == payload
    if extensible:
        assert restored["futureField"] == original["futureField"]
        del restored["futureField"]
        assert "futureField" not in restored
        assert "futureField" not in restored.to_dict()
    else:
        assert model.from_dict({**payload, "futureField": 1}).to_dict() == payload


def test_public_pm_outcome_round_trips_venue_terms_values() -> None:
    terms = PublicPmOutcomeVenueTerms(
        order_min_size=0,
        tick_size=None,
        fees_enabled=False,
        can_close_early=True,
        settlement_timer_seconds=0,
    )
    outcome = PublicPmOutcome(name="Yes", venue_terms=terms)

    payload = outcome.to_dict()
    assert payload["venueTerms"] == {
        "orderMinSize": 0,
        "tickSize": None,
        "feesEnabled": False,
        "canCloseEarly": True,
        "settlementTimerSeconds": 0,
    }
    assert PublicPmOutcome.from_dict(payload).to_dict() == payload


@pytest.mark.parametrize("enum", ENUMS, ids=lambda cls: cls.__name__)
def test_enum_wire_values_are_stable(enum):
    for value in enum:
        assert str(value) == value.value
        assert enum(value.value) is value


API_MODULES = sorted(
    [
        importlib.import_module(module.name)
        for module in pkgutil.walk_packages(coinrithm_sdk.api.__path__, prefix="coinrithm_sdk.api.")
        if not module.ispkg
    ],
    key=lambda module: module.__name__,
)


@pytest.mark.parametrize("module", API_MODULES, ids=lambda module: module.__name__.rsplit(".", 1)[-1])
def test_generated_endpoint_sync_and_async_preserve_http_errors(module):
    """All public entrypoints use the injected transport, never real trading APIs."""
    parameters = typing.get_type_hints(module._get_kwargs)
    args = {name: sample(parameters[name]) for name in inspect.signature(module._get_kwargs).parameters}
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(418, text="fixture undocumented status", headers={"x-fixture": "response-header"})

    transport = httpx.MockTransport(handler)
    with AuthenticatedClient(
        base_url="https://fixture.example.test", token="fixture-key", httpx_args={"transport": transport}
    ) as client:
        detailed = module.sync_detailed(client=client, **args)
        assert detailed.status_code == 418
        assert detailed.content == b"fixture undocumented status"
        assert detailed.headers["x-fixture"] == "response-header"
        assert detailed.parsed is None
        if hasattr(module, "sync"):
            assert module.sync(client=client, **args) is None
        client.raise_on_unexpected_status = True
        with pytest.raises(UnexpectedStatus):
            module.sync_detailed(client=client, **args)

    async def check_async():
        async with AuthenticatedClient(
            base_url="https://fixture.example.test", token="fixture-key", httpx_args={"transport": transport}
        ) as client:
            detailed = await module.asyncio_detailed(client=client, **args)
            assert detailed.status_code == 418
            assert detailed.parsed is None
            if hasattr(module, "asyncio"):
                assert await module.asyncio(client=client, **args) is None
            client.raise_on_unexpected_status = True
            with pytest.raises(UnexpectedStatus):
                await module.asyncio_detailed(client=client, **args)

    asyncio.run(check_async())
    assert len(requests) >= 4
    for request in requests:
        assert request.url.host == "fixture.example.test"
        assert request.headers["Authorization"] == "Bearer fixture-key"
        assert request.method in ("GET", "POST")
