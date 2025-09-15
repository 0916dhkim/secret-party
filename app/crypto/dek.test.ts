import assert from "node:assert";
import test from "node:test";
import {
  generateDek,
  wrapDekWithPassword,
  unwrapDekWithPassword,
  wrapDekWithPublicKey,
  unwrapDekWithPrivateKey,
} from "./dek";
import { generateKeyPair } from "./keypair";

test("DEK generation creates base64 string", () => {
  const dek = generateDek();

  // Should be a string
  assert.strictEqual(typeof dek, "string");

  // Should be valid base64 and decode to 32 bytes (256 bits)
  const decoded = Buffer.from(dek, "base64");
  assert.strictEqual(decoded.length, 32);
});

test("DEK password wrapping/unwrapping roundtrip", () => {
  const dek = generateDek();
  const password = "test-password-123";

  // Wrap DEK with password
  const wrapped = wrapDekWithPassword(dek, password);
  console.log(wrapped);

  // Should be a string with IV and encrypted data
  assert.strictEqual(typeof wrapped, "string");
  assert.ok(wrapped.includes(";"));

  // Unwrap and verify
  const unwrapped = unwrapDekWithPassword(wrapped, password);
  assert.strictEqual(unwrapped, dek);
});

test("DEK password unwrapping fails with wrong password", () => {
  const dek = generateDek();
  const password = "correct-password";
  const wrongPassword = "wrong-password";

  const wrapped = wrapDekWithPassword(dek, password);

  // Should throw when using wrong password
  assert.throws(() => {
    unwrapDekWithPassword(wrapped, wrongPassword);
  });
});

test("DEK wrapping/unwrapping roundtrip", async () => {
  const dek = generateDek();
  const keypair = await generateKeyPair();

  const wrapped = await wrapDekWithPublicKey(dek, keypair.publicKey);

  const unwrapped = await unwrapDekWithPrivateKey(wrapped, keypair.privateKey);
  assert.strictEqual(dek, unwrapped);
});
