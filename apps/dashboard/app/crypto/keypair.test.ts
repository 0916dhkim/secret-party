import assert from "node:assert";
import test from "node:test";
import {
  generateKeyPair,
  serializeKeyPair,
  deserializeKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
} from "./keypair";

test("serializeKeyPair converts keys to base64 strings", async () => {
  const keyPair = await generateKeyPair();
  const serialized = await serializeKeyPair(keyPair);

  // Should return object with publicKey and privateKey strings
  assert.strictEqual(typeof serialized.publicKey, "string");
  assert.strictEqual(typeof serialized.privateKey, "string");

  // Should be valid base64
  assert.match(serialized.publicKey, /^[A-Za-z0-9+/]+=*$/);
  assert.match(serialized.privateKey, /^[A-Za-z0-9+/]+=*$/);
});

test("deserializeKeyPair converts base64 back to CryptoKeys", async () => {
  const originalKeyPair = await generateKeyPair();
  const serialized = await serializeKeyPair(originalKeyPair);
  const deserializedKeyPair = await deserializeKeyPair(
    serialized.publicKey,
    serialized.privateKey
  );

  // Should return valid CryptoKey objects
  assert.ok(deserializedKeyPair.publicKey instanceof CryptoKey);
  assert.ok(deserializedKeyPair.privateKey instanceof CryptoKey);

  // Should have correct properties
  assert.strictEqual(deserializedKeyPair.publicKey.type, "public");
  assert.strictEqual(deserializedKeyPair.privateKey.type, "private");
  assert.strictEqual(deserializedKeyPair.publicKey.algorithm.name, "RSA-OAEP");
  assert.strictEqual(deserializedKeyPair.privateKey.algorithm.name, "RSA-OAEP");
});

test("serialize/deserialize roundtrip preserves functionality", async () => {
  const originalKeyPair = await generateKeyPair();
  const serialized = await serializeKeyPair(originalKeyPair);
  const deserializedKeyPair = await deserializeKeyPair(
    serialized.publicKey,
    serialized.privateKey
  );

  // Test that the deserialized keys can encrypt/decrypt
  const testData = new TextEncoder().encode("Hello, World!");

  const encrypted = await encryptWithPublicKey(
    testData,
    deserializedKeyPair.publicKey
  );
  const decrypted = await decryptWithPrivateKey(
    encrypted,
    deserializedKeyPair.privateKey
  );
  const decryptedText = new TextDecoder().decode(decrypted);

  assert.strictEqual(decryptedText, "Hello, World!");
});

test("encryptWithPublicKey encrypts data", async () => {
  const keyPair = await generateKeyPair();
  const testData = new TextEncoder().encode("Test message");

  const encrypted = await encryptWithPublicKey(testData, keyPair.publicKey);

  // Should return ArrayBuffer
  assert.ok(encrypted instanceof ArrayBuffer);
  assert.ok(encrypted.byteLength > 0);

  // Encrypted data should be different from original
  assert.notDeepStrictEqual(new Uint8Array(encrypted), testData);
});

test("decryptWithPrivateKey decrypts data", async () => {
  const keyPair = await generateKeyPair();
  const testMessage = "Secret message for decryption";
  const testData = new TextEncoder().encode(testMessage);

  const encrypted = await encryptWithPublicKey(testData, keyPair.publicKey);
  const decrypted = await decryptWithPrivateKey(encrypted, keyPair.privateKey);

  // Should decrypt back to original message
  const decryptedText = new TextDecoder().decode(decrypted);
  assert.strictEqual(decryptedText, testMessage);
});

test("encrypt/decrypt roundtrip with different data types", async () => {
  const keyPair = await generateKeyPair();

  // Test with empty data
  const emptyData = new Uint8Array(0);
  const encryptedEmpty = await encryptWithPublicKey(
    emptyData,
    keyPair.publicKey
  );
  const decryptedEmpty = await decryptWithPrivateKey(
    encryptedEmpty,
    keyPair.privateKey
  );
  assert.strictEqual(decryptedEmpty.byteLength, 0);

  // Test with binary data
  const binaryData = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
  const encryptedBinary = await encryptWithPublicKey(
    binaryData,
    keyPair.publicKey
  );
  const decryptedBinary = await decryptWithPrivateKey(
    encryptedBinary,
    keyPair.privateKey
  );
  assert.deepStrictEqual(new Uint8Array(decryptedBinary), binaryData);

  // Test with maximum length data (close to RSA limit)
  const maxData = new Uint8Array(190).fill(42); // RSA-2048 can encrypt ~190 bytes
  const encryptedMax = await encryptWithPublicKey(maxData, keyPair.publicKey);
  const decryptedMax = await decryptWithPrivateKey(
    encryptedMax,
    keyPair.privateKey
  );
  assert.deepStrictEqual(new Uint8Array(decryptedMax), maxData);
});

test("encryption produces different results each time", async () => {
  const keyPair = await generateKeyPair();
  const testData = new TextEncoder().encode("Same message");

  const encrypted1 = await encryptWithPublicKey(testData, keyPair.publicKey);
  const encrypted2 = await encryptWithPublicKey(testData, keyPair.publicKey);

  // Should produce different encrypted results due to OAEP padding
  assert.notDeepStrictEqual(
    new Uint8Array(encrypted1),
    new Uint8Array(encrypted2)
  );

  // But both should decrypt to the same message
  const decrypted1 = await decryptWithPrivateKey(
    encrypted1,
    keyPair.privateKey
  );
  const decrypted2 = await decryptWithPrivateKey(
    encrypted2,
    keyPair.privateKey
  );

  const text1 = new TextDecoder().decode(decrypted1);
  const text2 = new TextDecoder().decode(decrypted2);

  assert.strictEqual(text1, "Same message");
  assert.strictEqual(text2, "Same message");
});

test("decryption fails with wrong private key", async () => {
  const keyPair1 = await generateKeyPair();
  const keyPair2 = await generateKeyPair();
  const testData = new TextEncoder().encode("Secret data");

  const encrypted = await encryptWithPublicKey(testData, keyPair1.publicKey);

  // Should throw when using wrong private key
  await assert.rejects(async () => {
    await decryptWithPrivateKey(encrypted, keyPair2.privateKey);
  });
});
