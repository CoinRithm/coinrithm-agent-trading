import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt, loadMasterKey, secretEquals } from "./crypto.js";

const key = randomBytes(32);

describe("envelope encryption", () => {
  it("round-trips a secret", () => {
    const secret = "crk_live_abc123_DEF456";
    expect(decrypt(encrypt(secret, key), key)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encrypt("same", key);
    const b = encrypt("same", key);
    expect(a).not.toBe(b);
    expect(decrypt(a, key)).toBe("same");
    expect(decrypt(b, key)).toBe("same");
  });

  it("fails CLOSED when the ciphertext is tampered (auth tag)", () => {
    const blob = encrypt("secret", key);
    const parts = blob.split(":");
    const ct = Buffer.from(parts[3]!, "base64");
    ct[0] = ct[0]! ^ 0xff; // flip a byte
    const tampered = [parts[0], parts[1], parts[2], ct.toString("base64")].join(":");
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it("fails CLOSED with the wrong key", () => {
    const blob = encrypt("secret", key);
    expect(() => decrypt(blob, randomBytes(32))).toThrow();
  });

  it("rejects a malformed blob", () => {
    expect(() => decrypt("not-a-blob", key)).toThrow(/v1 format/);
    expect(() => decrypt("v2:a:b:c", key)).toThrow(/v1 format/);
  });

  it("loads a 32-byte key from hex or base64 and rejects bad lengths", () => {
    expect(loadMasterKey(key.toString("hex")).length).toBe(32);
    expect(loadMasterKey(key.toString("base64")).length).toBe(32);
    expect(() => loadMasterKey("tooshort")).toThrow(/32 bytes/);
    expect(() => loadMasterKey(randomBytes(16).toString("hex"))).toThrow(/32 bytes/);
  });

  it("secretEquals is length-safe", () => {
    expect(secretEquals("abc", "abc")).toBe(true);
    expect(secretEquals("abc", "abd")).toBe(false);
    expect(secretEquals("abc", "abcd")).toBe(false);
  });
});
