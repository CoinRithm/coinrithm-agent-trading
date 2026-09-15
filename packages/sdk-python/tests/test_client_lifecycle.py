"""Real httpx clients with in-memory transports; no API or model calls."""

import asyncio

import httpx
import pytest

from coinrithm_sdk import AuthenticatedClient, Client


@pytest.mark.parametrize("authenticated", [False, True])
@pytest.mark.parametrize("created", [False, True])
def test_updated_settings_reach_existing_and_new_clients(authenticated, created):
    async def run():
        transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"ok": True}))
        cls = AuthenticatedClient if authenticated else Client
        options = {"token": "fixture"} if authenticated else {}
        client = cls(
            base_url="https://fixture.invalid",
            headers={"x-original": "one"},
            cookies={"original": "one"},
            timeout=httpx.Timeout(1),
            httpx_args={"transport": transport},
            **options,
        )
        if created:
            client.get_httpx_client()
            client.get_async_httpx_client()
        changed = client.with_headers({"x-new": "two"}).with_cookies({"new": "two"}).with_timeout(httpx.Timeout(2))
        try:
            for wrapper in [client, changed]:
                sync = wrapper.get_httpx_client()
                async_client = wrapper.get_async_httpx_client()
                assert wrapper.get_httpx_client() is sync
                assert wrapper.get_async_httpx_client() is async_client
                for inner in [sync, async_client]:
                    assert inner.headers["x-original"] == "one"
                    if wrapper is changed:
                        assert inner.headers["x-new"] == "two"
                        assert inner.cookies["new"] == "two"
                        assert inner.timeout == httpx.Timeout(2)
                if authenticated:
                    assert sync.headers["Authorization"] == "Bearer fixture"
            # with_* updates already-instantiated transports as documented, while
            # evolve also returns a separately configured lazy wrapper.
            if created:
                assert client.get_httpx_client().headers["x-new"] == "two"
                assert client.get_async_httpx_client().headers["x-new"] == "two"
                updated_cookies = client.with_cookies({"later": "three"})
                updated_timeout = client.with_timeout(httpx.Timeout(3))
                assert client.get_httpx_client().cookies["later"] == "three"
                assert client.get_async_httpx_client().cookies["later"] == "three"
                assert client.get_httpx_client().timeout == httpx.Timeout(3)
                assert client.get_async_httpx_client().timeout == httpx.Timeout(3)
                assert updated_cookies is not client
                assert updated_timeout is not client
        finally:
            for wrapper in [client, changed]:
                wrapper.get_httpx_client().close()
                await wrapper.get_async_httpx_client().aclose()

    asyncio.run(run())


@pytest.mark.parametrize("authenticated", [False, True])
@pytest.mark.parametrize("prefix", ["Bearer", ""])
def test_context_managers_close_both_transports_and_preserve_auth(authenticated, prefix):
    async def run():
        requests = []

        def handle(request):
            requests.append(request)
            return httpx.Response(200, json={"ok": True})

        options = {"token": "fixture", "prefix": prefix, "auth_header_name": "X-Fixture-Auth"} if authenticated else {}
        cls = AuthenticatedClient if authenticated else Client
        with cls(
            base_url="https://fixture.invalid", httpx_args={"transport": httpx.MockTransport(handle)}, **options
        ) as client:
            sync = client.get_httpx_client()
            assert sync.get("/read").status_code == 200
        assert sync.is_closed
        async with cls(
            base_url="https://fixture.invalid", httpx_args={"transport": httpx.MockTransport(handle)}, **options
        ) as client:
            async_client = client.get_async_httpx_client()
            assert (await async_client.get("/read")).status_code == 200
        assert async_client.is_closed
        for request in requests:
            expected = f"{prefix} fixture" if prefix else "fixture"
            assert request.headers.get("X-Fixture-Auth") == (expected if authenticated else None)
            assert request.headers.get("Authorization") is None

    asyncio.run(run())


@pytest.mark.parametrize("authenticated", [False, True])
def test_explicit_transport_overrides_are_respected_and_closed(authenticated):
    async def run():
        cls = AuthenticatedClient if authenticated else Client
        client = cls(base_url="https://unused.invalid", **({"token": "unused-fixture"} if authenticated else {}))
        transport = httpx.MockTransport(lambda request: httpx.Response(204))
        sync = httpx.Client(base_url="https://injected.invalid", headers={"x-injected": "yes"}, transport=transport)
        async_client = httpx.AsyncClient(base_url="https://injected.invalid", transport=transport)
        assert client.set_httpx_client(sync) is client
        assert client.set_async_httpx_client(async_client) is client
        with client:
            assert client.get_httpx_client() is sync
            assert sync.get("/read").request.headers["x-injected"] == "yes"
            assert "Authorization" not in sync.headers
        async with client:
            assert client.get_async_httpx_client() is async_client
            assert (await async_client.get("/read")).status_code == 204
        assert sync.is_closed and async_client.is_closed

    asyncio.run(run())
