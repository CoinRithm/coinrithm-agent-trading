# Package publication

The package archives, the hosted services, the GitHub release and the official
MCP Registry are delivered separately. Current publication status is in the
[README](../README.md#version-clarity); package changes are in the
[changelog](../CHANGELOG.md).

## Pending combined release - MCP 0.7.16, TypeScript 0.3.5, Python 1.8.5

This release includes the reviewed provider-response guards, strategy controls,
market context and retained-input benchmark diagnostics, plus both SDKs generated
from the current contract. The pending versions are MCP **0.7.16**, TypeScript
**0.3.5** and Python **1.8.5**. The preceding published versions remain MCP 0.7.15,
TypeScript 0.3.4 and Python 1.8.4 until registry delivery is verified.

The earlier MCP-only preparation from release revision `56ceb2b4` predates the
funding-context consumer and latest benchmark diagnostics. Preserve its receipt
as history; prepare a new, complete four-archive set from the exact passing CI
revision. Do not mix that older MCP archive into this combined release, or upload
the already-published SDK versions again. Stage all archives, checksums, source
revision and notes together in the GitHub draft. Keep the draft and MCP Registry
unpublished until npm/PyPI delivery is confirmed. Hosted MCP and scheduler
deployments remain separate from package publication.

## Previous verified delivery — 23 September 2026

| Registry | Package                  | Version  | Files                                                                |
| -------- | ------------------------ | -------- | -------------------------------------------------------------------- |
| npm      | `@coinrithm/mcp-trading` | `0.7.13` | `coinrithm-mcp-trading-0.7.13.tgz`                                   |
| npm      | `@coinrithm/sdk`         | `0.3.2`  | `coinrithm-sdk-0.3.2.tgz`                                            |
| PyPI     | `coinrithm-sdk`          | `1.8.2`  | `coinrithm_sdk-1.8.2-py3-none-any.whl`, `coinrithm_sdk-1.8.2.tar.gz` |

The MCP package ships **both** `coinrithm-mcp` and `coinrithm-agent`; there is no
separate agent-runner npm upload. The Python wheel and source archive must come
from the same reviewed source. Do not mix archives from older preparation runs.

All three versions above are published. All four registry downloads match the
reviewed SHA-256 manifest; npm integrity also matches. Clean installs of the
downloaded packages passed the existing Node and Python smoke checks. The
commands below record the upload procedure; a subsequent release must use its
own reviewed versions and filenames, because these versions are immutable.

## Verified delivery — 24 September 2026

| Registry | Package                  | Version  | Files                                                                |
| -------- | ------------------------ | -------- | -------------------------------------------------------------------- |
| npm      | `@coinrithm/mcp-trading` | `0.7.14` | `coinrithm-mcp-trading-0.7.14.tgz`                                   |
| npm      | `@coinrithm/sdk`         | `0.3.3`  | `coinrithm-sdk-0.3.3.tgz`                                            |
| PyPI     | `coinrithm-sdk`          | `1.8.3`  | `coinrithm_sdk-1.8.3-py3-none-any.whl`, `coinrithm_sdk-1.8.3.tar.gz` |

All four registry downloads match the reviewed manifest for release source
`c374e782a87d01ee3b7a2fbff304ac6e6edb7123`, including npm integrity. The uploads
used the reviewed archives without repacking. The commands below document this
completed upload; do not upload these immutable versions again.

Clean-install Node/Python checks passed. The GitHub release is published, and
the official MCP Registry lists **0.7.14** as active and latest after the
[registry workflow](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/36003403675).

## Verified delivery — 2 October 2026

| Registry | Package                  | Version  | Files                                                                |
| -------- | ------------------------ | -------- | -------------------------------------------------------------------- |
| npm      | `@coinrithm/mcp-trading` | `0.7.15` | `coinrithm-mcp-trading-0.7.15.tgz`                                   |
| npm      | `@coinrithm/sdk`         | `0.3.4`  | `coinrithm-sdk-0.3.4.tgz`                                            |
| PyPI     | `coinrithm-sdk`          | `1.8.4`  | `coinrithm_sdk-1.8.4-py3-none-any.whl`, `coinrithm_sdk-1.8.4.tar.gz` |

All four public registry downloads match the reviewed `release-manifest.json`
and `SHA256SUMS.txt` byte for byte; npm integrity also matches. The archive build
source is `50d04c34c0349091d615519a16d93466df446e98`, with source tree
`61093354cce641c66b10c9efa40af479d85adb89`, identical to release revision
`04ecd28b7bf5e89a0117f72bfb40be56e66c7e3a`. The reviewed archive directory is
`output/release-20261001` in the shared workspace; registry verification is dated
2 October. These immutable versions are already uploaded; do not upload again.

The npm archives and Python wheel are the exact artifacts from
[CI run 36936874687](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/36936874687).
The source archive was built from the same reviewed source with poetry-core
2.5.0; its 455 package files and metadata match the wheel. Twine and the isolated
source-install smoke check passed before upload. Fresh installs of the downloaded
npm packages and Python wheel passed Node/Python smoke checks, including 41-tool
MCP discovery and runner interruption/recovery checks.

The [GitHub release](https://github.com/CoinRithm/coinrithm-agent-trading/releases/tag/mcp-trading-v0.7.15)
is published at the exact release revision above. The official MCP Registry
lists **0.7.15** as active and latest after
[workflow 36950719862](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/36950719862).
This publication does not restart hosted MCP or scheduler services.

### Superseded preparation — 28 September 2026

The older four archives and manifest used archive build source
`b8130033e89014ed9739c1916bf5b8495495ae3d`; that draft targeted the reviewed
`6ba6bb79356f5529b55879553a75fce70009a0eb`, whose subsequent changes affect only
the root README. These archives do not contain the contract, SDK and runner
changes merged after that preparation. **Do not treat the September 28 archives
as a release of current source**, even though the package version numbers have
not changed.

The October 2 verified delivery replaces that preparation. The old receipt is
retained as history; its archives were not the ones published. Runnable examples
now pin the verified TypeScript 0.3.4 and Python 1.8.4 releases.

## Prepare a release from newer source

To include changes made after the frozen draft:

1. Select an exact reviewed source revision and confirm its package versions
   are still available to publish. Align the release notes and package
   documentation with the features included in that revision.
2. Regenerate both SDKs from that revision's canonical `openapi.yaml`, using
   the committed generator configuration and Python templates. Follow the
   package and compatibility checks in [CI](../.github/workflows/ci.yml),
   reusing valid evidence only for unchanged source and dependencies.
3. Build the MCP archive, TypeScript SDK archive, and Python wheel and source
   archive from the selected source. Collect all four in a fresh artifact
   directory; do not mix them with the September 28 archives. Record the exact
   build revision, versions, filenames and SHA-256 values in a new
   `release-manifest.json` and matching `SHA256SUMS.txt`.
4. Verify the new archives and their clean-install checks, then update the
   GitHub draft's target, notes, complete archive set and manifest together.
   Retain the previous preparation's receipt as history, clearly identifying
   which artifact set is selected for upload.

A successful source CI run alone does not update release assets or publish
packages. The completed October 2 delivery is recorded above.

## Before uploading

1. Use the reviewed archive directory and its `release-manifest.json`. Verify
   each SHA-256 against that manifest. Stage the same archives and manifest in
   a GitHub draft, keeping it unpublished until registry delivery is verified.
2. Confirm the manifest's source tree has passed the applicable checks, that
   the generated SDKs match the contract, and that package documentation describes
   the same version. Reuse valid checks for unchanged runtime source.
3. Check whether each target version already exists. Registry versions are
   immutable. If a previous upload succeeded, compare its bytes with the manifest
   and skip only that matching upload; do not overwrite or blindly retry.

```powershell
npm view @coinrithm/mcp-trading@0.7.15 version dist.integrity --registry=https://registry.npmjs.org/
npm view @coinrithm/sdk@0.3.4 version dist.integrity --registry=https://registry.npmjs.org/
python -m pip index versions coinrithm-sdk
```

An npm `E404` can also occur while an accepted upload is still processing.
Check the original upload result and allow propagation before retrying. If a
target version already exists, verify its files instead of uploading again.

As verified on 2 October 2026, the registry versions are MCP 0.7.15,
TypeScript 0.3.4 and Python 1.8.4. The API reference follows the current contract;
its runnable examples are pinned to these published SDK versions.

## Upload the exact archives

Run these commands from the selected, reviewed artifact directory after the
checks above. The examples record the completed October 2 upload; future
releases must use their own unpublished versions and reviewed filenames.
Use the authorized publishing accounts.
Keep credentials in the local login/password prompts.

```powershell
npm login --auth-type=web --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish ./coinrithm-sdk-0.3.4.tgz --access public --registry=https://registry.npmjs.org/
npm publish ./coinrithm-mcp-trading-0.7.15.tgz --access public --registry=https://registry.npmjs.org/
```

For Python, use Twine in a dedicated local virtual environment. Check both
archives before uploading them together:

```powershell
python -m twine check ./coinrithm_sdk-1.8.4-py3-none-any.whl ./coinrithm_sdk-1.8.4.tar.gz
python -m twine upload --repository-url https://upload.pypi.org/legacy/ --username __token__ ./coinrithm_sdk-1.8.4-py3-none-any.whl ./coinrithm_sdk-1.8.4.tar.gz
```

At Twine's password prompt, use a PyPI API token authorized for `coinrithm-sdk`.
Do not put the token in a command, chat, source file or release asset. The
[npm publishing reference](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
and [Python packaging guide](https://packaging.python.org/en/latest/tutorials/packaging-projects/)
describe the underlying upload commands.

## Verify and finish the release

1. Download the exact versions from npm/PyPI and compare every archive's SHA-256
   and npm integrity with the reviewed manifest. Run clean-install SDK and
   MCP/agent startup checks without provider calls or trades.
2. Publish the prepared GitHub release only after registry verification. Its
   target commit, attached archives and checksums must match the reviewed source
   and uploads. Keep the previous release available.
3. Dispatch `.github/workflows/publish-mcp.yml` against the exact release ref
   after the matching npm version exists. The workflow publishes **MCP Registry
   metadata only**; it does not upload an npm package. Verify the resulting
   registry entry.
4. Update the README, changelog and release-status records from prepared to
   verified publication. Update runnable-example SDK pins to the published
   versions and run their existing tests before rebuilding Pages.
5. Verify the live documentation revision and contract. Package publication
   alone does not require restarting hosted MCP or scheduler. Compare runtime
   source first and deploy only if it differs and deployment is in scope.
