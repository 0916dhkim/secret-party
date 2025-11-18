import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "crypto";
import { sha3_256 } from "@noble/hashes/sha3";

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  return keyPair;
}

export async function serializeKeyPair(keyPair: CryptoKeyPair) {
  const publicKeyBuffer = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKeyBuffer = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  const publicKeyPEM = bufferToPEM(publicKeyBuffer, "PUBLIC KEY");
  const privateKeyPEM = bufferToPEM(privateKeyBuffer, "PRIVATE KEY");

  return {
    publicKey: publicKeyPEM,
    privateKey: privateKeyPEM,
  };
}

export async function deserializePublicKey(publicKeyPEM: string) {
  const publicKeyBuffer = pemToBuffer(publicKeyPEM, "PUBLIC KEY");

  const publicKey = await crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );

  return publicKey;
}

export async function deserializePrivateKey(privateKeyPEM: string) {
  const privateKeyBuffer = pemToBuffer(privateKeyPEM, "PRIVATE KEY");

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );

  return privateKey;
}

export async function deserializeKeyPair(
  publicKeyPEM: string,
  privateKeyPEM: string
) {
  const publicKey = await deserializePublicKey(publicKeyPEM);
  const privateKey = await deserializePrivateKey(privateKeyPEM);

  return { publicKey, privateKey };
}

export async function encryptWithPublicKey(
  data: BufferSource,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data);
}

export async function decryptWithPrivateKey(
  encryptedData: BufferSource,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedData
  );
}

function bufferToPEM(buffer: ArrayBuffer, type: string): string {
  const base64 = Buffer.from(buffer).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----`;
}

function pemToBuffer(pem: string, type: string) {
  // Remove the PEM headers and footers, including any surrounding whitespace
  const base64 = pem
    .replace(`-----BEGIN ${type}-----`, "")
    .replace(`-----END ${type}-----`, "")
    .replace(/\s/g, "");

  return Buffer.from(base64, "base64");
}

export function generateApiKey(): string {
  // Generate a 32-byte random key and encode as base64url
  const bytes = randomBytes(32);
  return "sk_" + Buffer.from(bytes).toString("base64url");
}

export function wrapPrivateKeyWithPassword(
  privateKeyPEM: string,
  password: string
): string {
  const aesKey = passwordToAesKey(password);
  const aesKeyBytes = Buffer.from(aesKey, "base64");
  const ivBytes = randomBytes(12); // 96-bit IV for GCM
  const iv = ivBytes.toString("base64");
  const privateKeyBytes = new TextEncoder().encode(privateKeyPEM);

  const cipher = gcm(aesKeyBytes, ivBytes);
  const encryptedBytes = cipher.encrypt(privateKeyBytes);
  const encrypted = Buffer.from(encryptedBytes).toString("base64");

  return `${iv};${encrypted}`;
}

export function unwrapPrivateKeyWithPassword(
  wrappedPrivateKey: string,
  password: string
): string {
  const [iv, encrypted] = wrappedPrivateKey.split(";");
  if (iv == null || encrypted == null) {
    throw new Error("Invalid wrapped private key format");
  }
  const ivBytes = Buffer.from(iv, "base64");
  const encryptedBytes = Buffer.from(encrypted, "base64");
  const aesKey = passwordToAesKey(password);
  const aesKeyBytes = Buffer.from(aesKey, "base64");

  const cipher = gcm(aesKeyBytes, ivBytes);
  const privateKeyBytes = cipher.decrypt(encryptedBytes);

  return new TextDecoder().decode(privateKeyBytes);
}

function passwordToAesKey(password: string): string {
  const passwordBytes = new TextEncoder().encode(password);
  return Buffer.from(sha3_256(passwordBytes)).toString("base64");
}
