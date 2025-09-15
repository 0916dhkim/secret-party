import { randomBytes } from "crypto";
import { gcm } from "@noble/ciphers/aes";
import { sha3_256 } from "@noble/hashes/sha3";

export function generateDek(): string {
  return Buffer.from(randomBytes(32)).toString("base64"); // 256 bits = 32 bytes
}

export function wrapDekWithPassword(dek: string, password: string) {
  const aesKey = passwordToAesKey(password);
  const aesKeyBytes = Buffer.from(aesKey, "base64");
  const ivBytes = randomBytes(12); // 96-bit IV for GCM
  const iv = ivBytes.toString("base64");
  const dekBytes = Buffer.from(dek, "base64");

  const cipher = gcm(aesKeyBytes, ivBytes);
  const dekEncryptedBytes = cipher.encrypt(dekBytes);
  const dekEncrypted = Buffer.from(dekEncryptedBytes).toString("base64");

  return `${iv};${dekEncrypted}`;
}

export function unwrapDekWithPassword(
  dekWrapped: string,
  password: string
): string {
  const [iv, dekEncrypted] = dekWrapped.split(";");
  if (iv == null || dekEncrypted == null) {
    throw new Error("Invalid dekWrapped format");
  }
  const ivBytes = Buffer.from(iv, "base64");
  const dekEncryptedBytes = Buffer.from(dekEncrypted, "base64");
  const aesKey = passwordToAesKey(password);
  const aesKeyBytes = Buffer.from(aesKey, "base64");

  const cipher = gcm(aesKeyBytes, ivBytes);
  const dekBytes = cipher.decrypt(dekEncryptedBytes);

  return Buffer.from(dekBytes).toString("base64");
}

export async function wrapDekWithPublicKey(dek: string, publicKey: CryptoKey) {
  const dekBytes = Buffer.from(dek, "base64");

  const dekEncryptedBytes = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    dekBytes
  );

  return Buffer.from(dekEncryptedBytes).toString("base64");
}

export async function unwrapDekWithPrivateKey(
  dekWrapped: string,
  privateKey: CryptoKey
) {
  const dekEncryptedBytes = Buffer.from(dekWrapped, "base64");
  const dekBytes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    dekEncryptedBytes
  );
  return Buffer.from(dekBytes).toString("base64");
}

function passwordToAesKey(password: string) {
  const passwordBytes = new TextEncoder().encode(password);
  return Buffer.from(sha3_256(passwordBytes)).toString("base64");
}
