// The package version, resolved at runtime from package.json so the MCP
// initialize handshake always reports the REAL published version on every
// transport. (It was previously hardcoded to "0.1.0" in both entries, which
// misled users debugging which build they had.)
//
// createRequire (not a JSON import) because package.json lives outside
// rootDir=src; at runtime dist/version.js resolves ../package.json to the
// package root in both the repo and the published tarball.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const SERVER_VERSION: string = (
  require("../package.json") as { version: string }
).version;
