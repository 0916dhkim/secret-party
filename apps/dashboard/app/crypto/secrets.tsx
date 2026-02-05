import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "crypto";

export function wrapSecret(value: string, dek: string): string {
  const ivBytes = randomBytes(12); // 96-bit IV for GCM
  const iv = ivBytes.toString("base64");
  const valueBytes = new TextEncoder().encode(value);
  const dekBytes = Buffer.from(dek, "base64");

  const cipher = gcm(dekBytes, ivBytes);

  const valueEncryptedBytes = cipher.encrypt(valueBytes);
  const valueEncrypted = Buffer.from(valueEncryptedBytes).toString("base64");
  return `${iv};${valueEncrypted}`;
}

export function unwrapSecret(secretWrapped: string, dek: string): string {
  const [iv, secretEncrypted] = secretWrapped.split(";");
  if (iv == null || secretEncrypted == null) {
    throw new Error("Invalid secretWrapped format");
  }

  const ivBytes = Buffer.from(iv, "base64");
  const secretEncryptedBytes = Buffer.from(secretEncrypted, "base64");
  const dekBytes = Buffer.from(dek, "base64");

  const cipher = gcm(dekBytes, ivBytes);

  const secretBytes = cipher.decrypt(secretEncryptedBytes);
  return new TextDecoder().decode(secretBytes);
}
