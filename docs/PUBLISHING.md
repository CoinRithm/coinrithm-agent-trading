# Package publication

The package archives, the hosted services, the GitHub release and the official
MCP Registry are delivered separately. Current publication status is in the
[README](../README.md#version-clarity); package changes are in the
[changelog](../CHANGELOG.md).

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
npm view @coinrithm/mcp-trading@0.7.14 version dist.integrity --registry=https://registry.npmjs.org/
npm view @coinrithm/sdk@0.3.3 version dist.integrity --registry=https://registry.npmjs.org/
python -m pip index versions coinrithm-sdk
```

An npm `E404` can also occur while an accepted upload is still processing.
Check the original upload result and allow propagation before retrying. If a
target version already exists, verify its files instead of uploading again.

As verified on 24 September 2026, the registry versions are MCP 0.7.14,
TypeScript 0.3.3 and Python 1.8.3. The API reference follows the current contract;
its runnable examples are pinned to these published SDK versions.

## Upload the exact archives

Run these commands from the reviewed artifact directory. Use the authorized
publishing accounts. Keep credentials in the local login/password prompts.

```powershell
npm login --auth-type=web --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish ./coinrithm-sdk-0.3.3.tgz --access public --registry=https://registry.npmjs.org/
npm publish ./coinrithm-mcp-trading-0.7.14.tgz --access public --registry=https://registry.npmjs.org/
```

For Python, use Twine in a dedicated local virtual environment. Check both
archives before uploading them together:

```powershell
python -m twine check ./coinrithm_sdk-1.8.3-py3-none-any.whl ./coinrithm_sdk-1.8.3.tar.gz
python -m twine upload --repository-url https://upload.pypi.org/legacy/ --username __token__ ./coinrithm_sdk-1.8.3-py3-none-any.whl ./coinrithm_sdk-1.8.3.tar.gz
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
   after npm 0.7.14 exists. The workflow publishes **MCP Registry metadata only**;
   it does not upload an npm package. Verify the resulting registry entry.
4. Update the README, changelog and release-status records from prepared to
   verified publication. Update runnable-example SDK pins to the published
   versions and run their existing tests before rebuilding Pages.
5. Verify the live documentation revision and contract. Package publication
   alone does not require restarting hosted MCP or scheduler. Compare runtime
   source first and deploy only if it differs and deployment is in scope.
