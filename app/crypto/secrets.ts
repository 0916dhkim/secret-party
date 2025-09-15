import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/utils";

/**
 * Encrypt a secret value using AES-256-GCM with the provided DEK
 */
export function encryptSecret(value: string, dek: Uint8Array): string {
  if (dek.length !== 32) {
    throw new Error("DEK must be exactly 32 bytes (256 bits)");
  }
  
  // Generate random IV for AES-GCM (96 bits)
  const iv = randomBytes(12);
  
  // Convert string to bytes
  const plaintext = new TextEncoder().encode(value);
  
  // Encrypt with AES-256-GCM
  const cipher = gcm(dek, iv);
  const ciphertext = cipher.encrypt(plaintext);
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt a secret value using AES-256-GCM with the provided DEK
 */
export function decryptSecret(encryptedValue: string, dek: Uint8Array): string {
  if (dek.length !== 32) {
    throw new Error("DEK must be exactly 32 bytes (256 bits)");
  }
  
  try {
    // Decode from base64
    const combined = new Uint8Array(Buffer.from(encryptedValue, "base64"));
    
    if (combined.length < 12 + 16) { // IV + minimum GCM tag
      throw new Error("Invalid encrypted data format");
    }
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    // Decrypt with AES-256-GCM
    const cipher = gcm(dek, iv);
    const decryptedBytes = cipher.decrypt(ciphertext);
    
    // Convert bytes back to string
    return new TextDecoder().decode(decryptedBytes);
    
  } catch (error) {
    throw new Error("Failed to decrypt secret: Invalid data or key");
  }
}

/**
 * Utility function to verify that a secret can be properly encrypted and decrypted
 * Used for testing encryption/decryption round-trip
 */
export function verifySecretEncryption(value: string, dek: Uint8Array): boolean {
  try {
    const encrypted = encryptSecret(value, dek);
    const decrypted = decryptSecret(encrypted, dek);
    return value === decrypted;
  } catch {
    return false;
  }
}