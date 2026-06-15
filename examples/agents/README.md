# Example agents

Real, validated agent folders for the [`coinrithm-agent` runner](../../docs/agent-runner.md).
Both were generated with the CLI (`coinrithm-agent new` / `eject` / `lock`) and
pass `validate --hosted`. Copy one, edit the strategy + caps, and run it.

| Folder | What it shows |
| --- | --- |
| [`momentum-futures/`](./momentum-futures) | **Folder-of-one** — a single `agent.md` (frontmatter config + plain-language strategy). The smallest valid agent; what `coinrithm-agent new` produces. |
| [`momentum-futures-decomposed/`](./momentum-futures-decomposed) | The **ejected** form of the same agent — config split into `character/` (strategy + hard caps), `runtime.yaml` (model + cadence), `safety/killSwitch.yaml`, `functionality/coinrithm.yaml`, plus a frozen `meta/manifest.lock.json`. Resolves to the *identical* spec. |

```bash
# Try one (no keys needed for these three):
coinrithm-agent validate examples/agents/momentum-futures --hosted
coinrithm-agent inspect  examples/agents/momentum-futures --json
coinrithm-agent eject    examples/agents/momentum-futures   # round-trips to the decomposed layout

# Run it (paper, dry-run by default — needs your keys):
COINRITHM_API_KEY=crk_live_… ANTHROPIC_API_KEY=sk-ant-… \
  coinrithm-agent run examples/agents/momentum-futures --once --dry-run
```

> Paper trading only — simulated funds, futures v1, not financial advice.
> The model key comes from the environment; it is **never** stored in an agent file.
