import { sha256 } from "@noble/hashes/sha256";

/**
 * Generate an RSA-2048 key pair
 * Note: This is a placeholder implementation using Web Crypto API
 * In a Node.js environment, you might want to use node:crypto instead
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  try {
    // Generate RSA-2048 key pair for RSA-OAEP encryption
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

    // Export public key as SPKI format (DER)
    const publicKeyBuffer = await crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );
    const publicKeyBase64 = Buffer.from(publicKeyBuffer).toString("base64");

    // Export private key as PKCS8 format (DER)
    const privateKeyBuffer = await crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );
    const privateKeyBase64 = Buffer.from(privateKeyBuffer).toString("base64");

    return {
      publicKey: `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`,
      privateKey: `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`,
    };
  } catch (error) {
    throw new Error(`Failed to generate key pair: ${error}`);
  }
}

/**
 * Decrypt data with RSA private key using RSA-OAEP
 */
export async function decryptWithPrivateKey(
  encryptedData: string,
  privateKey: string
): Promise<Uint8Array> {
  try {
    // Parse PEM private key
    const pemContent = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\n/g, "");
    
    const privateKeyBuffer = Buffer.from(pemContent, "base64");
    
    // Import private key
    const cryptoPrivateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["decrypt"]
    );

    // Decrypt the data
    const encryptedBuffer = Buffer.from(encryptedData, "base64");
    const decryptedBuffer = await crypto.subtle.decrypt(
      "RSA-OAEP",
      cryptoPrivateKey,
      encryptedBuffer
    );

    return new Uint8Array(decryptedBuffer);
  } catch (error) {
    throw new Error(`Failed to decrypt with private key: ${error}`);
  }
}

/**
 * Encrypt data with RSA public key using RSA-OAEP
 * This is mainly used for encrypting DEKs for API client access
 */
export async function encryptWithPublicKey(
  data: Uint8Array,
  publicKey: string
): Promise<string> {
  try {
    // Parse PEM public key
    const pemContent = publicKey
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\n/g, "");
    
    const publicKeyBuffer = Buffer.from(pemContent, "base64");
    
    // Import public key
    const cryptoPublicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      "RSA-OAEP",
      cryptoPublicKey,
      data
    );

    return Buffer.from(encryptedBuffer).toString("base64");
  } catch (error) {
    throw new Error(`Failed to encrypt with public key: ${error}`);
  }
}

/**
 * Generate a simplified public key identifier for database storage
 * This creates a short, unique identifier from the public key
 */
export function getPublicKeyId(publicKey: string): string {
  const hash = sha256(new TextEncoder().encode(publicKey));
  // Return first 16 bytes as hex (32 characters)
  return Buffer.from(hash.slice(0, 16)).toString("hex");
}