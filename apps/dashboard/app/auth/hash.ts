import { argon2id } from "@noble/hashes/argon2";
import { randomBytes } from "node:crypto";

const ARGON2_OPTIONS = {
  m: 65536, // Memory cost: 64 MB
  t: 3, // Time cost: 3 iterations
  p: 4, // Parallelism: 4 threads
} as const;

const TOKEN_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);

  const hash = argon2id(password, salt, ARGON2_OPTIONS);

  // Combine salt and hash into a single string for storage
  // Format: salt(hex):hash(hex)
  return `${salt.toString("hex")}:${Buffer.from(hash).toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Split the stored hash into salt and hash components.
    const [saltHex, hashHex] = hashedPassword.split(":");

    if (saltHex == null || hashHex == null) {
      return false;
    }

    // Convert hex strings back to bytes.
    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(hashHex, "hex");

    const candidateHash = argon2id(password, salt, ARGON2_OPTIONS);

    return Buffer.from(candidateHash).equals(storedHash);
  } catch (error) {
    throw new Error("Error in password verification", { cause: error });
  }
}

export function generateSessionToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}
