# Connect Codex to CoinRithm

[Quickstart](../QUICKSTART.md) · [API reference](https://coinrithm.github.io/coinrithm-agent-trading/)

Codex connects through MCP. Start with a CoinRithm key carrying only the `read`
scope. Set `COINRITHM_API_KEY` in the environment that launches Codex; keep its
value out of repository files and shell history.

## Hosted MCP

Add this to your Codex `config.toml`:

```toml
[mcp_servers.coinrithm]
url = "https://mcp.coinrithm.com/mcp"
bearer_token_env_var = "COINRITHM_API_KEY"
```

For keyless public prediction-market research, omit `bearer_token_env_var`.
Account reads and paper trades require a key with the appropriate scopes.

## Local MCP

Use this alternative configuration to launch the published npm package:

```toml
[mcp_servers.coinrithm]
command = "npx"
args = ["-y", "@coinrithm/mcp-trading"]
env_vars = ["COINRITHM_API_KEY"]
```

Choose one configuration. Restart or reconnect the MCP server after changing it.
Ask Codex to call `whoami` and `get_portfolio`; confirm the reported scopes.
An unpinned npm command uses the registry's current release, which can differ
from this repository's prepared version.

Configuration fields follow the [official Codex MCP documentation](https://developers.openai.com/codex/mcp/).
These examples describe the configuration contract; they do not certify every
Codex client version or an authenticated user session.
