"""Enforce line and branch floors for the SDK and reviewed request paths."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = (
    "coinrithm_sdk/client.py",
    "coinrithm_sdk/api/futures/open_futures_position.py",
    "coinrithm_sdk/api/prediction_markets/open_pm_position.py",
)


def check_coverage(report: dict) -> list[str]:
    files = {name.replace("\\", "/"): data for name, data in report["files"].items()}
    failures = []
    summaries = {"SDK total": report["totals"]}
    for target in TARGETS:
        if target not in files:
            failures.append(f"Missing coverage: {target}")
        else:
            summaries[target] = files[target]["summary"]
    for name, summary in summaries.items():
        for metric, covered, total in (
            ("lines", "covered_lines", "num_statements"),
            ("branches", "covered_branches", "num_branches"),
        ):
            count = summary[total]
            percent = 100 * summary[covered] / count if count else 100
            print(f"{name}: {metric} {percent:.2f}% (minimum 90%)")
            if percent < 90:
                failures.append(f"{name}: {metric} below 90% ({percent:.2f}%)")
    return failures


if __name__ == "__main__":
    failures = check_coverage(json.loads((ROOT / "coverage/coverage.json").read_text()))
    if failures:
        raise SystemExit("\n".join(failures))
