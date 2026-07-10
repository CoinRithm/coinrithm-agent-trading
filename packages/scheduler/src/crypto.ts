// Envelope encryption for per-agent secrets (the CoinRithm API key + any BYO
// model key). AES-256-GCM with a random 96-bit IV per value and the auth tag
// stored alongside, so tampering or a wrong key fails CLOSED (decrypt throws)
// rather than returning garbage. The master key never leaves the process env.

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";

// Accept the master key as 64 hex chars OR base64 of exactly 32 bytes.
export function loadMasterKey(raw: string): Buffer {
  const t = raw.trim();
  const buf = /^[0-9a-fA-F]{64}$/.test(t)
    ? Buffer.from(t, "hex")
    : Buffer.from(t, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be 32 bytes — provide 64 hex chars or base64 of 32 bytes",
    );
  }
  return buf;
}

// Returns "v1:<iv b64>:<tag b64>:<ciphertext b64>". Never logs the plaintext.
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(":");
}

export function decrypt(blob: string, key: Buffer): string {
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("ciphertext is not in the expected v1 format");
  }
  const iv = Buffer.from(parts[1]!, "base64");
  const tag = Buffer.from(parts[2]!, "base64");
  const ct = Buffer.from(parts[3]!, "base64");
  if (iv.length !== IV_BYTES) throw new Error("ciphertext has a malformed IV");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  // .final() throws if the auth tag does not verify (tamper / wrong key).
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8",
  );
}

// Constant-time equality for any secret comparisons callers may need.
export function secretEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
