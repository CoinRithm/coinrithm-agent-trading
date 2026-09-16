import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { after, before, test } from "node:test";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const python =
  process.env.PYTHON ||
  resolve(
    root,
    process.platform === "win32"
      ? ".venv/Scripts/python.exe"
      : ".venv/bin/python",
  );
const samples = JSON.parse(
  await readFile(resolve(root, "samples.json"), "utf8"),
);
const fakeKey = "docs-fixture-key-not-a-real-credential";
const temporary = await mkdtemp(resolve(tmpdir(), "coinrithm-docs-"));
const goBinary = resolve(
  temporary,
  process.platform === "win32" ? "events.exe" : "events",
);

before(async () => {
  // Compile the actual displayed Go file once, then execute it for each case.
  await run(
    process.env.GO || "go",
    ["build", "-o", goBinary, "http/events.go"],
    {
      cwd: root,
      timeout: 120_000,
    },
  );
});
after(() => {
  assert.equal(dirname(temporary), resolve(tmpdir()));
  return rm(temporary, { recursive: true, force: true });
});

const responses = {
  events: {
    data: [],
    pagination: { total: 0, limit: 3, offset: 0 },
    meta: { fixture: true },
  },
  identity: {
    userId: "fixture-user",
    keyId: 1,
    scopes: ["read"],
    agentName: null,
  },
  quote: {
    eligible: false,
    blockReasons: ["price_unavailable"],
    quantity: 0.01,
    side: "buy",
    executionPrice: null,
  },
  trades: { asOf: "2026-09-16T00:00:00+00:00", trades: [] },
};

async function exercise(
  command,
  args,
  sample,
  {
    status = 200,
    body = JSON.stringify(responses[sample.name]),
    missingKey = false,
  } = {},
) {
  const requests = [];
  const server = createServer(async (request, response) => {
    let requestBody = "";
    for await (const chunk of request) requestBody += chunk;
    requests.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: requestBody,
    });
    response.writeHead(status, { "content-type": "application/json" });
    response.end(body);
  });
  await new Promise((accept) => server.listen(0, "127.0.0.1", accept));
  const env = {
    ...process.env,
    COINRITHM_BASE_URL: `http://127.0.0.1:${server.address().port}`,
    COINRITHM_API_KEY: missingKey ? "" : fakeKey,
    HTTP_PROXY: "",
    HTTPS_PROXY: "",
    ALL_PROXY: "",
    NO_PROXY: "127.0.0.1",
  };
  let result;
  try {
    result = {
      ...(await run(command, args, { cwd: root, env, timeout: 15_000 })),
      code: 0,
    };
  } catch (error) {
    result = {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      code: error.code,
      killed: error.killed,
    };
  } finally {
    server.closeAllConnections();
    await new Promise((accept) => server.close(accept));
  }
  assert.notEqual(result.killed, true, `Example hung: ${result.stderr}`);
  assert.ok(
    !`${result.stdout}${result.stderr}`.includes(fakeKey),
    "Example leaked credentials",
  );
  return { ...result, requests };
}

for (const sample of samples) {
  const clients = [
    ["SDK JavaScript", process.execPath, [`sdk/${sample.name}.mjs`]],
    ["SDK Python", python, [`python/${sample.name}.py`]],
  ];
  if (sample.name === "events")
    clients.push(
      ["HTTP JavaScript", process.execPath, ["http/events.mjs"]],
      ["HTTP Python", python, ["http/events.py"]],
      ["HTTP Go", goBinary, []],
    );
  for (const [name, command, args] of clients) {
    test(`${name}: ${sample.name}`, async (t) => {
      await t.test(
        "sends the contracted request and preserves a valid empty/ineligible response",
        async () => {
          const result = await exercise(command, args, sample);
          assert.equal(result.code, 0, result.stderr);
          assert.deepEqual(JSON.parse(result.stdout), responses[sample.name]);
          assert.equal(result.requests.length, 1);
          const [request] = result.requests;
          const url = new URL(request.url, "http://fixture");
          assert.equal(url.pathname, sample.path);
          assert.equal(request.method.toLowerCase(), sample.method);
          assert.equal(
            request.headers.authorization,
            sample.name === "events" ? undefined : `Bearer ${fakeKey}`,
          );
          assert.equal(request.headers["x-api-key"], undefined);
          if (sample.name === "events" || sample.name === "trades")
            assert.equal(url.searchParams.get("limit"), "3");
          if (sample.name === "quote") {
            assert.match(request.headers["content-type"], /application\/json/);
            assert.deepEqual(JSON.parse(request.body), {
              coinId: "1",
              side: "buy",
              quantity: 0.01,
            });
          } else assert.equal(request.body, "");
        },
      );
      for (const status of sample.name === "events"
        ? [429, 500]
        : [401, 403, 429, 500]) {
        await t.test(`HTTP ${status} fails without retrying`, async () => {
          const result = await exercise(command, args, sample, {
            status,
            body: JSON.stringify({ error: "fixture_error" }),
          });
          assert.notEqual(result.code, 0);
          assert.match(result.stderr, new RegExp(String(status)));
          assert.equal(result.requests.length, 1);
        });
      }
      await t.test("malformed JSON fails", async () => {
        const result = await exercise(command, args, sample, {
          body: "invalid-json",
        });
        assert.notEqual(result.code, 0);
        assert.equal(result.requests.length, 1);
      });
      if (sample.name !== "events")
        await t.test("missing credentials fail before requesting", async () => {
          const result = await exercise(command, args, sample, {
            missingKey: true,
          });
          assert.notEqual(result.code, 0);
          assert.match(result.stderr, /Set COINRITHM_API_KEY/);
          assert.equal(result.requests.length, 0);
        });
    });
  }
}
