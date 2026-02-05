import assert from "node:assert";
import test from "node:test";
import { wrapSecret, unwrapSecret } from "./secrets";
import { generateDek } from "./dek";

test("wrapSecret creates a properly formatted wrapped secret", () => {
  const secret = "my-secret-value";
  const dek = generateDek();

  const wrapped = wrapSecret(secret, dek);

  // Should be a string with IV and encrypted data separated by semicolon
  assert.strictEqual(typeof wrapped, "string");
  assert.ok(wrapped.includes(";"));

  const [iv, encrypted] = wrapped.split(";");
  assert.ok(iv != null && iv.length > 0, "IV should not be empty");
  assert.ok(
    encrypted != null && encrypted.length > 0,
    "Encrypted data should not be empty"
  );

  // IV and encrypted data should be valid base64
  assert.doesNotThrow(() => Buffer.from(iv!, "base64"));
  assert.doesNotThrow(() => Buffer.from(encrypted!, "base64"));
});

test("wrap/unwrap secret roundtrip works correctly", () => {
  const secret = "Hello, World!";
  const dek = generateDek();

  const wrapped = wrapSecret(secret, dek);
  const unwrapped = unwrapSecret(wrapped, dek);

  assert.strictEqual(unwrapped, secret);
});

test("unwrapSecret fails with wrong DEK", () => {
  const secret = "secret-message";
  const correctDek = generateDek();
  const wrongDek = generateDek();

  const wrapped = wrapSecret(secret, correctDek);

  // Should throw when using wrong DEK
  assert.throws(() => {
    unwrapSecret(wrapped, wrongDek);
  });
});

test("unwrapSecret handles invalid format gracefully", () => {
  const dek = generateDek();

  // Test formats that should fail at format validation stage
  const formatErrors = ["invalid-format", "only-one-part", ""];

  formatErrors.forEach((invalid) => {
    assert.throws(() => {
      unwrapSecret(invalid, dek);
    }, /Invalid secretWrapped format/);
  });

  // Test formats that may pass initial validation but fail during decryption
  const decryptionErrors = [
    ";missing-iv",
    "missing-encrypted;",
    "invalid-base64;also-invalid-base64",
  ];

  decryptionErrors.forEach((invalid) => {
    assert.throws(() => {
      unwrapSecret(invalid, dek);
    }); // Just check that it throws, don't check specific error message
  });
});

test("wrapSecret produces different results for same input", () => {
  const secret = "same-secret";
  const dek = generateDek();

  const wrapped1 = wrapSecret(secret, dek);
  const wrapped2 = wrapSecret(secret, dek);

  // Should produce different wrapped results due to random IV
  assert.notStrictEqual(wrapped1, wrapped2);

  // But both should decrypt to the same secret
  const unwrapped1 = unwrapSecret(wrapped1, dek);
  const unwrapped2 = unwrapSecret(wrapped2, dek);

  assert.strictEqual(unwrapped1, secret);
  assert.strictEqual(unwrapped2, secret);
});

test("wrap/unwrap works with empty string", () => {
  const secret = "";
  const dek = generateDek();

  const wrapped = wrapSecret(secret, dek);
  const unwrapped = unwrapSecret(wrapped, dek);

  assert.strictEqual(unwrapped, "");
});

test("wrap/unwrap works with special characters and unicode", () => {
  const secret = "🔐 Special chars: !@#$%^&*()_+ 中文 العربية";
  const dek = generateDek();

  const wrapped = wrapSecret(secret, dek);
  const unwrapped = unwrapSecret(wrapped, dek);

  assert.strictEqual(unwrapped, secret);
});

test("wrap/unwrap works with long strings", () => {
  const secret = "A".repeat(10000); // 10KB string
  const dek = generateDek();

  const wrapped = wrapSecret(secret, dek);
  const unwrapped = unwrapSecret(wrapped, dek);

  assert.strictEqual(unwrapped, secret);
});

test("different DEKs produce different wrapped results", () => {
  const secret = "same-secret-value";
  const dek1 = generateDek();
  const dek2 = generateDek();

  const wrapped1 = wrapSecret(secret, dek1);
  const wrapped2 = wrapSecret(secret, dek2);

  // Different DEKs should produce different wrapped results
  assert.notStrictEqual(wrapped1, wrapped2);

  // Each should only decrypt with their respective DEK
  assert.strictEqual(unwrapSecret(wrapped1, dek1), secret);
  assert.strictEqual(unwrapSecret(wrapped2, dek2), secret);

  // Cross-decryption should fail
  assert.throws(() => unwrapSecret(wrapped1, dek2));
  assert.throws(() => unwrapSecret(wrapped2, dek1));
});
