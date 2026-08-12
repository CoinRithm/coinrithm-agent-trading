#!/usr/bin/env python3
"""Verify a CoinRithm Truth Receipt without trusting CoinRithm.

    python3 verify_receipt.py <decisionUuid>
    python3 verify_receipt.py                 # picks a signed one for you

Checks, in order:
  1. Recompute contentHash from the fields the API says it covers.
  2. Verify the ed25519 signature over the published message format.
  3. Confirm the row was signed by the CURRENT published key.

Step 1 needs nothing but the standard library. Step 2 needs `cryptography`
(pip install cryptography); without it the script says so and still does step 1,
rather than silently reporting a weaker check as a full verification.

Spec: ../../TRUTH_RECEIPTS.md
"""

import base64
import hashlib
import json
import sys
import urllib.request

API = "https://api.coinrithm.com"
UA = "coinrithm-receipt-verifier/1.0"


def get(path: str):
    req = urllib.request.Request(
        API + path, headers={"User-Agent": UA, "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def find_signed_uuid() -> str | None:
    """Walk the public directory for a signed (schemaVersion 3) decision."""
    cursor = None
    for _ in range(6):
        page = get(
            "/api/arena/decisions?limit=250"
            + (f"&cursor={cursor}" if cursor else "")
        )
        for row in page.get("decisions") or []:
            if row.get("schemaVersion") == 3 and row.get("decisionUuid"):
                return row["decisionUuid"]
        cursor = (page.get("pagination") or {}).get("nextCursor")
        if not cursor:
            break
    return None


def main() -> int:
    uuid = sys.argv[1] if len(sys.argv) > 1 else find_signed_uuid()
    if not uuid:
        print("no signed decision found")
        return 1

    artifact = get(f"/api/arena/decisions/{uuid}")
    key = get("/api/arena/attestation-key")
    print(f"receipt        {uuid}")
    print(f"schemaVersion  {artifact.get('schemaVersion')}")

    # -- 1. Recompute the hash -------------------------------------------------
    # contentHashFields is served WITH the row, so you never have to guess which
    # schema version it was written under.
    fields = artifact.get("contentHashFields") or []
    projection = {k: artifact.get(k) for k in fields}
    canonical = json.dumps(projection, sort_keys=True, separators=(",", ":"))
    recomputed = hashlib.sha256(canonical.encode()).hexdigest()
    served = artifact.get("contentHash")
    hash_ok = recomputed == served
    # ASCII only: a non-ASCII ellipsis here mangles on Windows consoles, and a
    # verification tool that prints mojibake undermines the thing it is proving.
    print(f"hash           {'MATCH' if hash_ok else 'MISMATCH'}  ({recomputed[:16]}...)")
    if not hash_ok:
        print(f"  served       {served}")
        return 1

    # -- 2 & 3. Signature and key identity ------------------------------------
    signature = artifact.get("signature")
    if not signature:
        print("signature      none — this row is integrity-checkable only (see TRUTH_RECEIPTS.md §5)")
        return 0

    if artifact.get("signingKeyId") != key.get("keyId"):
        print(
            f"key            MISMATCH — row signed by {artifact.get('signingKeyId')}, "
            f"current key is {key.get('keyId')}"
        )
        return 1
    print(f"key            {key.get('keyId')} (current)")

    # The signed message is NOT the bare hash — it is the published format
    # string with the hash substituted.
    message = key["signedMessageFormat"].replace("<contentHash>", served).encode()
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import (
            Ed25519PublicKey,
        )
    except ImportError:
        print("signature      SKIPPED — pip install cryptography to complete step 2")
        return 0

    public_key = Ed25519PublicKey.from_public_bytes(
        base64.b64decode(key["publicKeyBase64"])
    )
    try:
        public_key.verify(base64.b64decode(signature), message)
    except Exception as exc:  # noqa: BLE001 - any failure means "not verified"
        print(f"signature      FAILED ({type(exc).__name__})")
        return 1

    print("signature      VERIFIES")
    print("\nThis decision has not been altered since it was attested.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
