import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));
const original = await readJSON("_site/contract.json");
const rendered = await readJSON("_site/openapi.json");
const samples = await readJSON("examples/clients/samples.json");

test("rendered reference changes documentation only, preserving every wire contract and security rule", () => {
  const normalized = structuredClone(rendered);
  normalized.info.description = original.info.description;
  delete normalized.info["x-scalar-sdk-installation"];
  for (const [index, server] of normalized.servers.entries()) {
    server.description = original.servers[index].description;
  }
  normalized.components.securitySchemes.bearerAuth.description =
    original.components.securitySchemes.bearerAuth.description;
  for (const { path, method } of samples) {
    normalized.paths[path][method].description =
      original.paths[path][method].description;
    delete normalized.paths[path][method]["x-codeSamples"];
  }
  assert.deepEqual(normalized, original);
  assert.deepEqual(
    rendered.paths["/api/prediction-markets/events"].get.security,
    [],
  );
  assert.deepEqual(rendered.security, [{ bearerAuth: [] }]);
});

test("every SDK and HTTP code sample is the exact runnable source file", async () => {
  let count = 0;
  for (const { path, method, name } of samples) {
    const files = [`sdk/${name}.mjs`, `python/${name}.py`];
    if (name === "events")
      files.push("http/events.mjs", "http/events.py", "http/events.go");
    const displayed = rendered.paths[path][method]["x-codeSamples"];
    assert.equal(displayed.length, files.length);
    for (const [index, file] of files.entries()) {
      assert.equal(
        displayed[index].source,
        await readFile(`examples/clients/${file}`, "utf8"),
      );
      count++;
    }
  }
  assert.equal(count, 11);
});

test("downloadable YAML is the unchanged canonical source and the shell uses its local artifact", async () => {
  assert.equal(
    await readFile("_site/openapi.yaml", "utf8"),
    await readFile("openapi.yaml", "utf8"),
  );
  const html = await readFile("_site/index.html", "utf8");
  assert.match(html, /url: "\.\/openapi.json"/);
  assert.match(html, /name="docs-revision" content="[a-f0-9]{40}"/);
  assert.match(
    rendered.info.description,
    /Leave the Authentication panel empty for public requests/,
  );
  assert.equal(rendered.info["x-scalar-sdk-installation"].length, 2);
});
