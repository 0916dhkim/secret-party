import { verifyPassword } from "./hash";
import { getSession } from "./session";

/**
 * Verify the current user's password
 * This is used for sensitive operations that require password confirmation
 */
export async function verifyUserPassword(password: string): Promise<boolean> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("User not authenticated");
  }
  
  return await verifyPassword(password, session.user.passwordHash);
}

/**
 * Middleware function to require password confirmation for server actions
 * Usage: Add this as validation step in server actions that perform sensitive operations
 */
export async function requirePasswordConfirmation(password: string): Promise<void> {
  if (!password) {
    throw new Error("Password confirmation is required");
  }
  
  const isValid = await verifyUserPassword(password);
  if (!isValid) {
    throw new Error("Invalid password");
  }
}

/**
 * Hook for client-side password verification
 * Returns a function that can be used to verify passwords in components
 */
export function createPasswordVerifier() {
  return async (password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const { valid } = await response.json();
      return valid;
    } catch {
      return false;
    }
  };
}