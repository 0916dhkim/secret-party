import { randomBytes } from "crypto";
import { gcm } from "@noble/ciphers/aes";
import { argon2id } from "@noble/hashes/argon2";

const ARGON2_KDF_OPTIONS = {
  m: 65536, // 64 MB memory cost
  t: 3, // 3 iterations
  p: 4, // 4 threads
} as const;

export function generateDek(): string {
  return Buffer.from(randomBytes(32)).toString("base64"); // 256 bits = 32 bytes
}

export function wrapDekWithPassword(dek: string, password: string): string {
  // Generate random salt for this environment
  const salt = randomBytes(16); // 128-bit salt

  // Derive AES key from password using Argon2id
  const aesKeyBytes = passwordToAesKey(password, salt);

  // Generate random IV for AES-GCM
  const ivBytes = randomBytes(12); // 96-bit IV for GCM
  const dekBytes = Buffer.from(dek, "base64");

  // Encrypt DEK with AES-256-GCM
  const cipher = gcm(aesKeyBytes, ivBytes);
  const dekEncryptedBytes = cipher.encrypt(dekBytes);

  // Format: salt:iv;ciphertext (consistent with passwordHash format)
  const saltHex = salt.toString("hex");
  const ivBase64 = ivBytes.toString("base64");
  const ciphertextBase64 = Buffer.from(dekEncryptedBytes).toString("base64");

  return `${saltHex}:${ivBase64};${ciphertextBase64}`;
}

export function unwrapDekWithPassword(
  dekWrapped: string,
  password: string,
): string {
  // Parse format: salt:iv;ciphertext
  const [saltHex, ivAndCiphertext] = dekWrapped.split(":");
  if (saltHex == null || ivAndCiphertext == null) {
    throw new Error("Invalid dekWrapped format: missing salt");
  }

  const [ivBase64, ciphertextBase64] = ivAndCiphertext.split(";");
  if (ivBase64 == null || ciphertextBase64 == null) {
    throw new Error("Invalid dekWrapped format: missing iv or ciphertext");
  }

  // Decode components
  const salt = Buffer.from(saltHex, "hex");
  const ivBytes = Buffer.from(ivBase64, "base64");
  const dekEncryptedBytes = Buffer.from(ciphertextBase64, "base64");

  // Derive AES key from password using Argon2id with stored salt
  const aesKeyBytes = passwordToAesKey(password, salt);

  // Decrypt DEK with AES-256-GCM
  const cipher = gcm(aesKeyBytes, ivBytes);
  const dekBytes = cipher.decrypt(dekEncryptedBytes);

  return Buffer.from(dekBytes).toString("base64");
}

export async function wrapDekWithPublicKey(dek: string, publicKey: CryptoKey) {
  const dekBytes = Buffer.from(dek, "base64");

  const dekEncryptedBytes = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    dekBytes,
  );

  return Buffer.from(dekEncryptedBytes).toString("base64");
}

export async function unwrapDekWithPrivateKey(
  dekWrapped: string,
  privateKey: CryptoKey,
) {
  const dekEncryptedBytes = Buffer.from(dekWrapped, "base64");
  const dekBytes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    dekEncryptedBytes,
  );
  return Buffer.from(dekBytes).toString("base64");
}

function passwordToAesKey(password: string, salt: Buffer): Buffer {
  // Use Argon2id for key derivation (same as password hashing)
  const key = argon2id(password, salt, ARGON2_KDF_OPTIONS);
  return Buffer.from(key);
}
