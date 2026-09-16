import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Input is the JSON produced by Redocly from the canonical openapi.yaml.
// Documentation annotations never change operation security or wire schemas.
const [input = "_site/openapi.json", output = "_site"] = process.argv.slice(2);
const spec = JSON.parse(await readFile(input, "utf8"));
const contract = structuredClone(spec);
const examples = "examples/clients";
const samples = JSON.parse(await readFile(`${examples}/samples.json`, "utf8"));
const sdk = JSON.parse(await readFile(`${examples}/package.json`, "utf8"));
const pythonRequirement = (
  await readFile(`${examples}/requirements.txt`, "utf8")
).trim();
const guide =
  "https://github.com/CoinRithm/coinrithm-agent-trading/tree/main/examples/clients";

for (const sample of samples) {
  const operation = spec.paths[sample.path]?.[sample.method];
  if (operation?.operationId !== sample.operationId) {
    throw new Error(
      `Example no longer matches the contract: ${sample.operationId}`,
    );
  }
  const files = [
    ["JavaScript", "CoinRithm JS / TS SDK", `sdk/${sample.name}.mjs`],
    ["Python", "CoinRithm Python SDK", `python/${sample.name}.py`],
  ];
  if (sample.name === "events") {
    files.push(
      ["JavaScript", "Node.js fetch (HTTP)", "http/events.mjs"],
      ["Python", "Python urllib (HTTP)", "http/events.py"],
      ["Go", "Go net/http (HTTP)", "http/events.go"],
    );
  }
  operation["x-codeSamples"] = await Promise.all(
    files.map(async ([lang, label, file]) => ({
      lang,
      label,
      source: await readFile(`${examples}/${file}`, "utf8"),
    })),
  );
  operation.description = `${operation.description || ""}\n\n**Runnable examples:** choose a CoinRithm SDK or HTTP example in the request panel. [Install dependencies and run the exact files](${guide}).`;
}

spec.info["x-scalar-sdk-installation"] = [
  {
    lang: "TypeScript",
    description: `**CoinRithm SDK for JavaScript and TypeScript.** Node.js 20+. [Runnable examples and setup](${guide}#javascript-and-typescript-sdk).`,
    source: `npm install @coinrithm/sdk@${sdk.dependencies["@coinrithm/sdk"]}`,
  },
  {
    lang: "Python",
    description: `**CoinRithm Python SDK.** Python 3.10+. [Runnable examples and setup](${guide}#python-sdk).`,
    source: `python -m pip install ${pythonRequirement}`,
  },
];
if (!spec.info.description.includes("## Start without an API key")) {
  throw new Error(
    "The keyless introduction heading changed; update its documentation annotations.",
  );
}
spec.info.description = spec.info.description.replace(
  "## Start without an API key",
  `## Start without an API key\n\nLeave the Authentication panel empty for public requests. It configures the key for protected account and trading operations; each operation shows its own requirement.\n\n[Open the public event request](#tag/public-pm-data/GET/api/prediction-markets/events) and use its client menu to choose a CoinRithm SDK or HTTP example. The installation tabs here are for the maintained SDKs. [Run the examples locally](${guide}).\n\n**Go (Golang):** [open the runnable Go HTTP example](https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/examples/clients/http/events.go). It uses the standard library and needs no API key. From \`examples/clients\`, run \`go run http/events.go\`.`,
);
spec.components.securitySchemes.bearerAuth.description =
  "For protected account and trading operations. Leave empty for public data. Personal CoinRithm API key, format crk_live_….";
for (const server of spec.servers || []) {
  if (server.url === "https://api.coinrithm.com") {
    server.description = "Production API · paper trading with virtual funds";
  }
}

await mkdir(output, { recursive: true });
await cp("docs", output, { recursive: true });
await cp("openapi.yaml", resolve(output, "openapi.yaml"));
await writeFile(
  resolve(output, "contract.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
);
await writeFile(
  resolve(output, "openapi.json"),
  `${JSON.stringify(spec, null, 2)}\n`,
);
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const html = await readFile(resolve(output, "index.html"), "utf8");
await writeFile(
  resolve(output, "index.html"),
  html.replace(
    "<!-- docs-revision -->",
    `<meta name="docs-revision" content="${revision}" />`,
  ),
);
console.log(
  `Built API reference at ${output} from ${revision}; ${samples.length} operations have tested source examples.`,
);
