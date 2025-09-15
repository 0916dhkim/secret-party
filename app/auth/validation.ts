import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Signup validation schema
export const signupSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// Password verification schema
export const passwordVerificationSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// API key creation schema
export const apiKeyCreationSchema = z.object({
  name: z
    .string()
    .min(1, "API key name is required")
    .max(100, "API key name too long")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "API key name contains invalid characters"),
  environmentIds: z
    .array(z.number().int().positive())
    .min(1, "At least one environment must be selected")
    .max(50, "Too many environments selected"),
  password: z.string().min(1, "Password is required"),
});

// Project management schemas
export const projectCreationSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name too long")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Project name contains invalid characters"),
  password: z.string().min(1, "Password is required"),
});

export const environmentCreationSchema = z.object({
  name: z
    .string()
    .min(1, "Environment name is required")
    .max(50, "Environment name too long")
    .regex(/^[a-zA-Z0-9\-_]+$/, "Environment name can only contain letters, numbers, hyphens, and underscores"),
  projectId: z.number().int().positive("Invalid project ID"),
  password: z.string().min(1, "Password is required"),
});

// Secret management schemas
export const secretCreationSchema = z.object({
  key: z
    .string()
    .min(1, "Secret key is required")
    .max(200, "Secret key too long")
    .regex(/^[A-Z][A-Z0-9_]*$/, "Secret key must be uppercase with underscores (e.g., DATABASE_URL)"),
  value: z
    .string()
    .min(1, "Secret value is required")
    .max(10000, "Secret value too long"),
  environmentId: z.number().int().positive("Invalid environment ID"),
  projectId: z.number().int().positive("Invalid project ID"),
  password: z.string().min(1, "Password is required"),
});

export const secretUpdateSchema = z.object({
  key: z
    .string()
    .min(1, "Secret key is required")
    .max(200, "Secret key too long"),
  value: z
    .string()
    .min(1, "Secret value is required")
    .max(10000, "Secret value too long"),
  environmentId: z.number().int().positive("Invalid environment ID"),
  projectId: z.number().int().positive("Invalid project ID"),
  password: z.string().min(1, "Password is required"),
});

// Input sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/[\x00-\x1f\x7f-\x9f]/g, ""); // Remove control characters
}

export function sanitizeSecretKey(key: string): string {
  return key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

// Form data parser utility
export function parseFormData<T>(formData: FormData | Record<string, unknown>, schema: z.ZodSchema<T>): T {
  let data: Record<string, unknown>;
  
  if (formData instanceof FormData) {
    data = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        data[key] = value;
      }
    }
  } else {
    data = formData;
  }

  return schema.parse(data);
}

// Rate limiting helpers
const attemptTracking = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const current = attemptTracking.get(identifier);

  if (!current || now > current.resetTime) {
    attemptTracking.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxAttempts) {
    return false;
  }

  current.count++;
  return true;
}

export function resetRateLimit(identifier: string): void {
  attemptTracking.delete(identifier);
}

// XSS Prevention
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// SQL Injection Prevention (we use Drizzle ORM with parameterized queries, but this is for extra safety)
export function validateIdentifier(identifier: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}