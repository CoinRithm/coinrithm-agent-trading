import { describe, it, expect, vi, afterEach } from "vitest";
import { providerForRoute, selectProvider } from "./providers.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";

// conservative template -> model anthropic/claude-sonnet-4-6.
const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;

describe.each(["nvidia", "anthropic"] as const)(
  "%s provider end-to-end deadline",
  (providerName) => {
    afterEach(() => vi.useRealTimers());

    function makeProvider(fetchFn: typeof fetch) {
      return selectProvider(
        { ...spec, model: { provider: providerName, name: "test-model" } },
        { NVIDIA_API_KEY: "test-only", ANTHROPIC_API_KEY: "test-only" },
        fetchFn,
      );
    }

    it("releases a header wait even when fetch ignores abort", async () => {
      vi.useFakeTimers();
      let signal: AbortSignal | null | undefined;
      const fetchFn = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
        signal = init?.signal;
        return new Promise<Response>(() => {});
      });
      const pending = makeProvider(fetchFn).decide({
        system: "s",
        user: "u",
        timeoutMs: 20,
      });
      await vi.advanceTimersByTimeAsync(20);
      const result = await pending;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("timed out after 20ms");
        expect(result.status).toBeUndefined();
      }
      expect(signal?.aborted).toBe(true);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([200, 429, 410, 500])(
      "bounds an HTTP %i body wait that ignores abort, preserving known error status",
      async (status) => {
        vi.useFakeTimers();
        let signal: AbortSignal | null | undefined;
        let rejectBody!: (reason: Error) => void;
        const response = new Response("", {
          status,
          ...(status === 429 ? { headers: { "Retry-After": "12" } } : {}),
        });
        const body = vi
          .spyOn(response, status === 200 ? "json" : "text")
          .mockImplementation(
            () =>
              new Promise((_resolve, reject) => {
                rejectBody = reject;
              }),
          );
        const fetchFn = vi
          .fn<typeof fetch>()
          .mockImplementation(async (_url, init) => {
            signal = init?.signal;
            return response;
          });
        const pending = makeProvider(fetchFn).decide({
          system: "s",
          user: "u",
          timeoutMs: 20,
        });
        await vi.advanceTimersByTimeAsync(20);
        const result = await pending;
        expect(body).toHaveBeenCalledTimes(1);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain("timed out after 20ms");
          expect(result.status).toBe(status === 200 ? undefined : status);
          expect(result.retryAfterMs).toBe(status === 429 ? 12_000 : undefined);
          if (status !== 200) expect(result.error).toContain(`HTTP ${status}`);
        }
        expect(signal?.aborted).toBe(true);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
        // A body that eventually rejects after its deadline must not cause an
        // unhandled rejection or change the already-returned cycle result.
        rejectBody(new Error("late body rejection"));
        await Promise.resolve();
      },
    );

    it("retains normal decoded output and clears the deadline after body completion", async () => {
      vi.useFakeTimers();
      let signal: AbortSignal | null | undefined;
      const decision = '{"decision":"skip"}';
      const payload =
        providerName === "anthropic"
          ? {
              content: [{ text: decision }],
              usage: { input_tokens: 7, output_tokens: 3 },
            }
          : {
              choices: [{ message: { content: decision } }],
              usage: { prompt_tokens: 7, completion_tokens: 3 },
            };
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockImplementation(async (_url, init) => {
          signal = init?.signal;
          return new Response(JSON.stringify(payload));
        });
      const result = await makeProvider(fetchFn).decide({
        system: "s",
        user: "u",
        timeoutMs: 20,
      });
      expect(result).toEqual({
        ok: true,
        text: decision,
        usage: { promptTokens: 7, completionTokens: 3 },
      });
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(100);
      expect(signal?.aborted).toBe(false);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("returns malformed-body failure and clears its deadline without an extra request", async () => {
      vi.useFakeTimers();
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("not JSON"));
      const result = await makeProvider(fetchFn).decide({
        system: "s",
        user: "u",
        timeoutMs: 20,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).not.toContain("timed out");
      expect(vi.getTimerCount()).toBe(0);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  },
);

describe("direct NVIDIA same-model retry", () => {
  afterEach(() => vi.useRealTimers());
  const model = "nvidia/nemotron-3-super-120b-a12b";
  // Exact body retained for all 112 HTTP 500 failures in the audited window.
  const serverError = JSON.stringify({
    error: {
      message: "Internal server error",
      type: "Internal Server Error",
      code: 500,
    },
  });
  const decision = '{"decision":"skip","actions":[]}';
  const success = () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: decision } }],
        usage: { prompt_tokens: 7, completion_tokens: 3 },
      }),
    );
  const direct = (fetchFn: typeof fetch) =>
    selectProvider(
      { ...spec, model: { provider: "nvidia", name: model } },
      { NVIDIA_API_KEY: "nvapi-test" },
      fetchFn,
    );

  it.each([500, 502, 503, 504])(
    "retries HTTP %i once with byte-identical body/key/route and retains both attempts",
    async (status) => {
      vi.useFakeTimers();
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(serverError, { status }))
        .mockResolvedValueOnce(success());
      const pending = direct(fetchFn).decide({
        system: "STRATEGY",
        user: "OBSERVATION",
      });
      await vi.advanceTimersByTimeAsync(999);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      const result = await pending;
      expect(fetchFn).toHaveBeenCalledTimes(2);
      const [first, second] = fetchFn.mock.calls;
      expect(first?.[0]).toBe(
        "https://integrate.api.nvidia.com/v1/chat/completions",
      );
      expect(second?.[0]).toBe(first?.[0]);
      expect(second?.[1]?.body).toBe(first?.[1]?.body);
      expect(second?.[1]?.headers).toEqual(first?.[1]?.headers);
      expect(JSON.parse(first?.[1]?.body as string)).toMatchObject({
        model,
        temperature: 0.2,
        max_tokens: 1024,
        chat_template_kwargs: { enable_thinking: false },
        tool_choice: {
          type: "function",
          function: { name: "submit_trading_decision" },
        },
      });
      expect(result).toMatchObject({
        ok: true,
        text: decision,
        usage: { promptTokens: 7, completionTokens: 3 },
        route: {
          profile: "configured",
          reason: "configured_direct",
          effectiveProvider: "nvidia",
          effectiveModel: model,
          attempts: [
            {
              provider: "nvidia",
              model,
              outcome: "failed",
              failureClass: "transient",
              status,
            },
            { provider: "nvidia", model, outcome: "success" },
          ],
        },
      });
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("stops after two 500s without rerouting or discarding the initial error", async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(serverError, { status: 500 }),
      );
    const pending = direct(fetchFn).decide({ system: "s", user: "u" });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: false,
      status: 500,
      route: {
        attempts: [
          { status: 500, outcome: "failed" },
          { status: 500, outcome: "failed" },
        ],
      },
    });
    expect(result.route?.attempts[0]?.error).toContain(serverError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([400, 401, 403, 404, 410, 422, 429, 501])(
    "does not retry HTTP %i (including the observed empty 404 body)",
    async (status) => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("", { status }));
      const result = await direct(fetchFn).decide({ system: "s", user: "u" });
      expect(result).toMatchObject({ ok: false, status });
      expect(result.route).toBeUndefined();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
  );

  it("does not retry network errors or malformed/empty provider output", async () => {
    const cases = [
      vi.fn<typeof fetch>().mockRejectedValue(new Error("network unavailable")),
      vi.fn<typeof fetch>().mockResolvedValue(new Response("not JSON")),
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify({ choices: [] }))),
    ];
    for (const fetchFn of cases) {
      const result = await direct(fetchFn).decide({ system: "s", user: "u" });
      expect(result.ok).toBe(false);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    }
    const malformedDecision = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"decision":"act" INVALID' } }],
        }),
      ),
    );
    // The runner's decision parser rejects this; no hidden repair model call.
    await direct(malformedDecision).decide({ system: "s", user: "u" });
    expect(malformedDecision).toHaveBeenCalledTimes(1);
  });

  it.each(["Error", "AbortError"])(
    "does not retry a 500 whose body throws %s, while preserving the known status",
    async (name) => {
      const response = new Response("", { status: 500 });
      vi.spyOn(response, "text").mockRejectedValue(
        Object.assign(new Error("upstream body failed"), { name }),
      );
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
      const result = await direct(fetchFn).decide({ system: "s", user: "u" });
      expect(result).toMatchObject({ ok: false, status: 500 });
      if (!result.ok) expect(result.retryableHttpFailure).toBeUndefined();
      expect(result.route).toBeUndefined();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
  );

  it("honors a short Retry-After without retrying before it", async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(serverError, {
          status: 503,
          headers: { "Retry-After": "3" },
        }),
      )
      .mockResolvedValueOnce(success());
    const pending = direct(fetchFn).decide({ system: "s", user: "u" });
    await vi.advanceTimersByTimeAsync(2999);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).route?.attempts[0]?.retryAfterMs).toBe(3000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { retryAfter: "6", timeoutMs: 300_000 },
    { retryAfter: "3", timeoutMs: 2000 },
  ])(
    "does not shorten a long cooldown or exceed the original deadline: %j",
    async ({ retryAfter, timeoutMs }) => {
      vi.useFakeTimers();
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(serverError, {
          status: 503,
          headers: { "Retry-After": retryAfter },
        }),
      );
      const result = await direct(fetchFn).decide({
        system: "s",
        user: "u",
        timeoutMs,
      });
      expect(result).toMatchObject({
        ok: false,
        status: 503,
        retryAfterMs: Number(retryAfter) * 1000,
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("caps a hung second attempt at the original deadline, even if fetch ignores abort", async () => {
    vi.useFakeTimers();
    let retrySignal: AbortSignal | null | undefined;
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(serverError, { status: 500 }))
      .mockImplementationOnce((_url, init) => {
        retrySignal = init?.signal;
        return new Promise<Response>(() => {});
      });
    const pending = direct(fetchFn).decide({
      system: "s",
      user: "u",
      timeoutMs: 2000,
    });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;
    expect(result).toMatchObject({
      ok: false,
      route: { attempts: [{ status: 500 }, { outcome: "failed" }] },
    });
    if (!result.ok) expect(result.error).toContain("timed out after 1000ms");
    expect(retrySignal?.aborted).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not add attempts beneath the shared router/probe route factory", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(serverError, { status: 500 }));
    const result = await providerForRoute(
      { provider: "nvidia", model },
      "nvapi-test",
      fetchFn,
    ).decide({ system: "s", user: "u" });
    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(result.route).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe.each(["nvidia", "anthropic"] as const)(
  "%s error privacy",
  (providerName) => {
    it("redacts exact keys and standard credential patterns before retaining an HTTP body", async () => {
      const privateKey = "unprefixed-private-key-value";
      const secrets = [
        privateKey,
        "nvapi-another-key",
        "crk_live_another_key",
        "sk-another-key",
        "ghp_another_key",
        "AIza_another_key",
        "eyJheader.eyJpayload.signature",
      ];
      const body =
        JSON.stringify({
          error: {
            message: secrets.join(" "),
            api_key: "unprefixed-other-key",
          },
        }) + " Bearer unprefixed-bearer-value";
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(body, { status: 401 }));
      const provider = selectProvider(
        { ...spec, model: { provider: providerName, name: "test-model" } },
        { NVIDIA_API_KEY: privateKey, ANTHROPIC_API_KEY: privateKey },
        fetchFn,
      );
      const result = await provider.decide({ system: "s", user: "u" });
      expect(result).toMatchObject({ ok: false, status: 401 });
      if (!result.ok) {
        for (const secret of [
          ...secrets,
          "unprefixed-other-key",
          "unprefixed-bearer-value",
        ]) {
          expect(result.error).not.toContain(secret);
        }
        expect(result.error).toContain("[redacted]");
      }
    });

    it("redacts a thrown transport error and a key crossing the retention cap", async () => {
      const privateKey = "unprefixed-private-key-value";
      for (const fetchFn of [
        vi
          .fn<typeof fetch>()
          .mockRejectedValue(new Error(`transport echoed ${privateKey}`)),
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response("x".repeat(1990) + privateKey, { status: 401 }),
          ),
      ]) {
        const result = await selectProvider(
          { ...spec, model: { provider: providerName, name: "test-model" } },
          { NVIDIA_API_KEY: privateKey, ANTHROPIC_API_KEY: privateKey },
          fetchFn,
        ).decide({ system: "s", user: "u" });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).not.toContain("unprefixed");
          expect(result.error.length).toBeLessThanOrEqual(2030);
        }
      }
    });
  },
);

describe("selectProvider", () => {
  it("throws when the env key is missing (key never from the agent file)", () => {
    expect(() => selectProvider(spec, {}, fetch)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("uses the env key only and sends it as a header", async () => {
    let sentKey: string | undefined;
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      sentKey = (init.headers as Record<string, string>)["x-api-key"];
      return new Response(
        JSON.stringify({ content: [{ text: '{"decision":"skip"}' }] }),
        { status: 200 },
      );
    });
    const p = selectProvider(
      spec,
      { ANTHROPIC_API_KEY: "sk-ant-test" },
      fetchFn as unknown as typeof fetch,
    );
    const r = await p.decide({ system: "s", user: "u" });
    expect(r.ok).toBe(true);
    expect(sentKey).toBe("sk-ant-test");
  });

  it("nvidia preset hits the NIM endpoint with NVIDIA_API_KEY (no baseUrl needed)", async () => {
    const nvSpec = {
      ...spec,
      model: {
        provider: "nvidia" as const,
        name: "meta/llama-3.3-70b-instruct",
      },
    };
    let url = "";
    let auth: string | undefined;
    const fetchFn = vi.fn(async (u: string, init: RequestInit) => {
      url = u;
      auth = (init.headers as Record<string, string>)["Authorization"];
      return new Response(
        JSON.stringify({
          choices: [
            { message: { content: '{"decision":"skip","actions":[]}' } },
          ],
        }),
        { status: 200 },
      );
    });
    const p = selectProvider(
      nvSpec,
      { NVIDIA_API_KEY: "nvapi-test" },
      fetchFn as unknown as typeof fetch,
    );
    const r = await p.decide({ system: "s", user: "u" });
    expect(r.ok).toBe(true);
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect(auth).toBe("Bearer nvapi-test");
  });

  it("nvidia preset errors with a clear NVIDIA_API_KEY message when the key is absent", () => {
    const nvSpec = {
      ...spec,
      model: {
        provider: "nvidia" as const,
        name: "meta/llama-3.3-70b-instruct",
      },
    };
    expect(() => selectProvider(nvSpec, {}, fetch)).toThrow(/NVIDIA_API_KEY/);
  });

  it("mechanical preset needs NO key and returns a stub that never issues a model call", async () => {
    const mechSpec = {
      ...spec,
      model: { provider: "mechanical" as const, name: "market-implied" },
    };
    // No env key at all — must NOT throw a missing-key error (unlike every LLM provider).
    const p = selectProvider(mechSpec, {}, fetch);
    expect(p.label).toBe("mechanical/market-implied");
    // The stub fails closed if ever invoked (runCycle short-circuits before this).
    const r = await p.decide({ system: "s", user: "u" });
    expect(r.ok).toBe(false);
  });

  it("forces 'detailed thinking off' for nemotron models (else they emit a slow think-chain)", async () => {
    const nemoSpec = {
      ...spec,
      model: {
        provider: "nvidia" as const,
        name: "nvidia/llama-3.3-nemotron-super-49b-v1",
      },
    };
    let systemSent = "";
    const fetchFn = vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as {
        messages: Array<{ role: string; content: string }>;
      };
      systemSent =
        body.messages.find((m) => m.role === "system")?.content ?? "";
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"decision":"skip"}' } }],
        }),
        { status: 200 },
      );
    });
    const p = selectProvider(
      nemoSpec,
      { NVIDIA_API_KEY: "nvapi-test" },
      fetchFn as unknown as typeof fetch,
    );
    await p.decide({ system: "STRATEGY", user: "u" });
    expect(systemSent.startsWith("detailed thinking off")).toBe(true);
    expect(systemSent).toContain("STRATEGY");
  });

  it.each([
    "nvidia/nemotron-3-nano-30b-a3b",
    "nvidia/nemotron-3-super-120b-a12b",
  ])(
    "disables thinking through NVIDIA chat_template_kwargs for %s",
    async (model) => {
      const nemoSpec = {
        ...spec,
        model: { provider: "nvidia" as const, name: model },
      };
      let sentBody: Record<string, unknown> = {};
      const fetchFn = vi.fn(async (_u: string, init: RequestInit) => {
        sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"decision":"skip"}' } }],
          }),
          { status: 200 },
        );
      });
      const p = selectProvider(
        nemoSpec,
        { NVIDIA_API_KEY: "nvapi-test" },
        fetchFn as unknown as typeof fetch,
      );
      await p.decide({ system: "STRATEGY", user: "u" });
      expect(sentBody.chat_template_kwargs).toEqual({
        enable_thinking: false,
      });
    },
  );

  it("returns NVIDIA's forced decision-tool arguments as the decision text", async () => {
    const nemoSpec = {
      ...spec,
      model: {
        provider: "nvidia" as const,
        name: "nvidia/nemotron-3-nano-30b-a3b",
      },
    };
    const decision = JSON.stringify({
      decision: "act",
      actions: [
        {
          type: "futures_open",
          symbol: "MOVR",
          side: "short",
          leverage: 3,
          marginMusd: 750,
        },
      ],
    });
    const fetchFn = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      function: {
                        name: "submit_trading_decision",
                        arguments: decision,
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const p = selectProvider(
      nemoSpec,
      { NVIDIA_API_KEY: "nvapi-test" },
      fetchFn as unknown as typeof fetch,
    );
    const result = await p.decide({ system: "STRATEGY", user: "u" });
    expect(result).toMatchObject({ ok: true, text: decision });
  });

  it("does NOT add the reasoning toggle for non-nemotron models", async () => {
    const nvSpec = {
      ...spec,
      model: {
        provider: "nvidia" as const,
        name: "meta/llama-3.1-8b-instruct",
      },
    };
    let systemSent = "";
    const fetchFn = vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as {
        messages: Array<{ role: string; content: string }>;
      };
      systemSent =
        body.messages.find((m) => m.role === "system")?.content ?? "";
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"decision":"skip"}' } }],
        }),
        { status: 200 },
      );
    });
    const p = selectProvider(
      nvSpec,
      { NVIDIA_API_KEY: "nvapi-test" },
      fetchFn as unknown as typeof fetch,
    );
    await p.decide({ system: "STRATEGY", user: "u" });
    expect(systemSent).toBe("STRATEGY");
  });

  it("surfaces structured status + Retry-After on provider refusals (A2)", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response("busy", { status: 429, headers: { "retry-after": "12" } }),
    );
    const p = selectProvider(
      {
        ...spec,
        model: {
          provider: "nvidia" as const,
          name: "nvidia/nemotron-3-nano-30b-a3b",
        },
      },
      { NVIDIA_API_KEY: "nvapi-x" },
      fetchFn as unknown as typeof fetch,
    );
    const res = await p.decide({ system: "s", user: "u" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(429);
      expect(res.retryAfterMs).toBe(12000);
    }
  });

  it("preserves status and leaves Retry-After unset on 5xx without its header", async () => {
    const fetchFn = vi.fn(async () => new Response("boom", { status: 503 }));
    const p = selectProvider(
      {
        ...spec,
        model: {
          provider: "nvidia" as const,
          name: "nvidia/nemotron-3-nano-30b-a3b",
        },
      },
      { NVIDIA_API_KEY: "nvapi-x" },
      fetchFn as unknown as typeof fetch,
    );
    const res = await p.decide({ system: "s", user: "u" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(503);
      expect(res.retryAfterMs).toBeUndefined();
    }
  });

  it("aborts a hung model call and reports a timeout (never bleeds past the cadence)", async () => {
    const nvSpec = {
      ...spec,
      model: {
        provider: "nvidia" as const,
        name: "meta/llama-3.1-8b-instruct",
      },
    };
    // fetchFn that only settles when the abort signal fires.
    const fetchFn = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          );
        }),
    );
    const p = selectProvider(
      nvSpec,
      { NVIDIA_API_KEY: "nvapi-test" },
      fetchFn as unknown as typeof fetch,
    );
    const r = await p.decide({ system: "s", user: "u", timeoutMs: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/timed out/);
  });
});
