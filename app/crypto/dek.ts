import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/utils";
import { scrypt } from "@noble/hashes/scrypt";
import { encryptWithPublicKey } from "./keypair";

// DEK (Data Encryption Key) size - 256 bits for AES-256
const DEK_SIZE = 32;

// Key derivation parameters
const SALT_SIZE = 32;
const SCRYPT_N = 2 ** 16; // CPU/memory cost
const SCRYPT_R = 8; // Block size
const SCRYPT_P = 1; // Parallelization

/**
 * Generate a new 256-bit Data Encryption Key (DEK)
 */
export function generateDEK(): Uint8Array {
  return randomBytes(DEK_SIZE);
}

/**
 * Encrypt a DEK with a user password using scrypt key derivation + AES-256-GCM
 */
export function encryptDEKWithPassword(dek: Uint8Array, password: string): string {
  // Generate random salt for key derivation
  const salt = randomBytes(SALT_SIZE);
  
  // Derive key from password using scrypt
  const derivedKey = scrypt(
    new TextEncoder().encode(password),
    salt,
    { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, dkLen: 32 }
  );
  
  // Generate random IV for AES-GCM
  const iv = randomBytes(12); // 96-bit IV for GCM
  
  // Encrypt DEK with AES-256-GCM
  const cipher = gcm(derivedKey, iv);
  const encryptedDEK = cipher.encrypt(dek);
  
  // Combine salt + iv + ciphertext and encode as base64
  const combined = new Uint8Array(
    SALT_SIZE + iv.length + encryptedDEK.length
  );
  combined.set(salt, 0);
  combined.set(iv, SALT_SIZE);
  combined.set(encryptedDEK, SALT_SIZE + iv.length);
  
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt a DEK with a user password
 */
export function decryptDEKWithPassword(
  encryptedDEK: string,
  password: string
): Uint8Array {
  // Decode from base64
  const combined = new Uint8Array(Buffer.from(encryptedDEK, "base64"));
  
  if (combined.length < SALT_SIZE + 12 + 16) {
    throw new Error("Invalid encrypted DEK format");
  }
  
  // Extract components
  const salt = combined.slice(0, SALT_SIZE);
  const iv = combined.slice(SALT_SIZE, SALT_SIZE + 12);
  const ciphertext = combined.slice(SALT_SIZE + 12);
  
  // Derive key from password using same parameters
  const derivedKey = scrypt(
    new TextEncoder().encode(password),
    salt,
    { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, dkLen: 32 }
  );
  
  // Decrypt DEK with AES-256-GCM
  const cipher = gcm(derivedKey, iv);
  
  try {
    const decryptedDEK = cipher.decrypt(ciphertext);
    return decryptedDEK;
  } catch (error) {
    throw new Error("Failed to decrypt DEK: Invalid password or corrupted data");
  }
}

/**
 * Encrypt a DEK with an RSA public key (for API client access)
 */
export async function encryptDEKWithPublicKey(
  dek: Uint8Array,
  publicKey: string
): Promise<string> {
  return await encryptWithPublicKey(dek, publicKey);
}

/**
 * Utility to clear sensitive data from memory
 */
export function clearSensitiveData(data: Uint8Array): void {
  data.fill(0);
}