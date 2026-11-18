import assert from "node:assert/strict";
import { test } from "node:test";
import { ALLOWED, evaluate } from "./audit-gate.mjs";

const advisory = (name, severity, ghsa) => ({
  source: 1,
  name,
  title: `${name} advisory`,
  url: `https://github.com/advisories/${ghsa}`,
  severity,
  range: "*",
});
const report = (...entries) => ({
  vulnerabilities: Object.fromEntries(
    entries.map(([name, via]) => [name, { name, severity: "high", via }]),
  ),
});
const allowed = {
  "GHSA-aaaa-aaaa-aaaa": {
    package: "picomatch",
    expires: "2026-12-18",
    reason: "test",
  },
};
const picomatch = advisory("picomatch", "high", "GHSA-aaaa-aaaa-aaaa");

test("a clean report passes", () => {
  assert.deepEqual(evaluate({ vulnerabilities: {} }, allowed, "2026-11-18"), {
    ok: true,
    unusable: false,
    blocking: [],
    excused: [],
  });
});

test("an allowlisted advisory is excused, with packages that only depend on it", () => {
  const result = evaluate(
    report(["picomatch", [picomatch]], ["vitest", ["picomatch"]]),
    allowed,
    "2026-12-18",
  );
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.excused.map((a) => a.id),
    ["GHSA-aaaa-aaaa-aaaa"],
  );
});

test("the exception stops working the day after it expires", () => {
  const result = evaluate(
    report(["picomatch", [picomatch]]),
    allowed,
    "2026-12-19",
  );
  assert.equal(result.ok, false);
  assert.match(result.blocking[0].why, /expired on 2026-12-18/);
});

test("any other high or critical advisory blocks, even beside an excused one", () => {
  for (const severity of ["high", "critical"]) {
    const result = evaluate(
      report(
        ["picomatch", [picomatch]],
        ["express", [advisory("express", severity, "GHSA-bbbb-bbbb-bbbb")]],
      ),
      allowed,
      "2026-11-18",
    );
    assert.equal(result.ok, false);
    assert.deepEqual(
      result.blocking.map((a) => a.id),
      ["GHSA-bbbb-bbbb-bbbb"],
    );
  }
});

test("an exception does not cover the same id on another package", () => {
  const result = evaluate(
    report(["other", [advisory("other", "high", "GHSA-aaaa-aaaa-aaaa")]]),
    allowed,
    "2026-11-18",
  );
  assert.equal(result.ok, false);
});

test("moderate and low advisories do not block, as before", () => {
  const result = evaluate(
    report(
      ["hono", [advisory("hono", "moderate", "GHSA-cccc-cccc-cccc")]],
      ["qs", [advisory("qs", "low", "GHSA-dddd-dddd-dddd")]],
    ),
    allowed,
    "2026-11-18",
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.excused, []);
});

test("a missing or failed report fails closed", () => {
  for (const bad of [undefined, null, {}, { error: { code: "ENOLOCK" } }])
    assert.deepEqual(evaluate(bad, allowed, "2026-11-18"), {
      ok: false,
      unusable: true,
      blocking: [],
      excused: [],
    });
});

test("every real exception names a package, a reason and an ISO expiry date", () => {
  for (const [id, rule] of Object.entries(ALLOWED)) {
    assert.match(id, /^GHSA(-[a-z0-9]{4}){3}$/);
    assert.match(rule.expires, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(rule.package.length > 0);
    assert.ok(rule.reason.length > 40);
  }
});
