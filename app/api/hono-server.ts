import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { db } from "../db/db";
import { eq, and } from "drizzle-orm";
import { 
  projectTable, 
  environmentTable, 
  secretTable, 
  environmentAccessTable 
} from "../db/schema";
import { 
  requireAPIAuth, 
  requireEnvironmentAccess,
  getEnvironmentDEKForClient
} from "../auth/api-key-auth";
import { decryptWithPrivateKey } from "../crypto/keypair";
import { decryptSecret } from "../crypto/secrets";

// Validation schemas
const secretQuerySchema = z.object({
  project: z.string().transform(Number),
  environment: z.string().transform(Number),
  key: z.string().optional(),
});

const createSecretSchema = z.object({
  projectId: z.number(),
  environmentId: z.number(),
  key: z.string().min(1),
  value: z.string().min(1),
});

const updateSecretSchema = z.object({
  projectId: z.number(),
  environmentId: z.number(),
  key: z.string().min(1),
  value: z.string().min(1),
});

// Create Hono app
const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: ["http://localhost:3000", "http://localhost:5173"], // Add your frontend URLs
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
}));

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API v1 routes
const v1 = new Hono();

/**
 * List secrets in environment
 * GET /api/v1/secrets?project=<project-id>&environment=<environment-id>
 */
v1.get("/secrets", async (c) => {
  try {
    // Parse and validate query parameters
    const query = secretQuerySchema.parse({
      project: c.req.query("project"),
      environment: c.req.query("environment"),
    });

    // Authenticate API key and check environment access
    const { auth } = await requireEnvironmentAccess(c.req.raw, query.environment);

    // Get secrets for this environment
    const secrets = await db.query.secretTable.findMany({
      where: eq(secretTable.environmentId, query.environment),
      columns: {
        key: true,
        // Don't return encrypted values in list view
      },
    });

    return c.json({
      secretKeys: secrets.map(s => s.key),
    });

  } catch (error: any) {
    if (error instanceof Response) {
      throw error; // Re-throw HTTP responses from middleware
    }
    
    console.error("Error listing secrets:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get specific secret
 * GET /api/v1/secret?project=<project-id>&environment=<environment-id>&key=<key>
 */
v1.get("/secret", async (c) => {
  try {
    // Parse and validate query parameters
    const query = secretQuerySchema.parse({
      project: c.req.query("project"),
      environment: c.req.query("environment"),
      key: c.req.query("key"),
    });

    if (!query.key) {
      return c.json({ error: "key parameter is required" }, 400);
    }

    // Authenticate API key and check environment access
    const { auth, dekWrapped } = await requireEnvironmentAccess(c.req.raw, query.environment);

    // Get the specific secret
    const secret = await db.query.secretTable.findFirst({
      where: and(
        eq(secretTable.environmentId, query.environment),
        eq(secretTable.key, query.key)
      ),
    });

    if (!secret) {
      return c.json({ error: "Secret not found" }, 404);
    }

    // Return the encrypted secret and DEK
    // The client will need to decrypt the DEK with their private key,
    // then use that DEK to decrypt the secret value
    return c.json({
      key: secret.key,
      encrypted_dek: dekWrapped,
      encrypted_secret: secret.valueEncrypted,
    });

  } catch (error: any) {
    if (error instanceof Response) {
      throw error; // Re-throw HTTP responses from middleware
    }
    
    console.error("Error getting secret:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Create new secret
 * POST /api/v1/secret
 */
v1.post("/secret", async (c) => {
  try {
    const body = await c.req.json();
    const data = createSecretSchema.parse(body);

    // Authenticate API key and check environment access
    const { auth, dekWrapped } = await requireEnvironmentAccess(c.req.raw, data.environmentId);

    // Check if secret already exists
    const existingSecret = await db.query.secretTable.findFirst({
      where: and(
        eq(secretTable.environmentId, data.environmentId),
        eq(secretTable.key, data.key)
      ),
    });

    if (existingSecret) {
      return c.json({ error: "Secret with this key already exists" }, 409);
    }

    // For API creation, we expect the client to provide already encrypted value
    // The client should encrypt the value with the DEK they decrypted
    const encryptedValue = data.value; // Assume client already encrypted this

    // Insert the secret
    await db.insert(secretTable).values({
      environmentId: data.environmentId,
      key: data.key,
      valueEncrypted: encryptedValue,
    });

    // Log the operation
    console.log(`Secret created via API: ${data.key} in environment ${data.environmentId} by client ${auth.clientName}`);

    return c.json({}, 201);

  } catch (error: any) {
    if (error instanceof Response) {
      throw error; // Re-throw HTTP responses from middleware
    }
    
    console.error("Error creating secret:", error);
    
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request data", details: error.errors }, 400);
    }
    
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Update existing secret
 * PUT /api/v1/secret
 */
v1.put("/secret", async (c) => {
  try {
    const body = await c.req.json();
    const data = updateSecretSchema.parse(body);

    // Authenticate API key and check environment access
    const { auth } = await requireEnvironmentAccess(c.req.raw, data.environmentId);

    // Check if secret exists
    const existingSecret = await db.query.secretTable.findFirst({
      where: and(
        eq(secretTable.environmentId, data.environmentId),
        eq(secretTable.key, data.key)
      ),
    });

    if (!existingSecret) {
      return c.json({ error: "Secret not found" }, 404);
    }

    // For API updates, we expect the client to provide already encrypted value
    const encryptedValue = data.value; // Assume client already encrypted this

    // Update the secret
    await db.update(secretTable)
      .set({ valueEncrypted: encryptedValue })
      .where(and(
        eq(secretTable.environmentId, data.environmentId),
        eq(secretTable.key, data.key)
      ));

    // Log the operation
    console.log(`Secret updated via API: ${data.key} in environment ${data.environmentId} by client ${auth.clientName}`);

    return c.json({}, 200);

  } catch (error: any) {
    if (error instanceof Response) {
      throw error; // Re-throw HTTP responses from middleware
    }
    
    console.error("Error updating secret:", error);
    
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request data", details: error.errors }, 400);
    }
    
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Delete secret
 * DELETE /api/v1/secret?project=<project-id>&environment=<environment-id>&key=<key>
 */
v1.delete("/secret", async (c) => {
  try {
    // Parse and validate query parameters
    const query = secretQuerySchema.parse({
      project: c.req.query("project"),
      environment: c.req.query("environment"),
      key: c.req.query("key"),
    });

    if (!query.key) {
      return c.json({ error: "key parameter is required" }, 400);
    }

    // Authenticate API key and check environment access
    const { auth } = await requireEnvironmentAccess(c.req.raw, query.environment);

    // Delete the secret
    const result = await db.delete(secretTable)
      .where(and(
        eq(secretTable.environmentId, query.environment),
        eq(secretTable.key, query.key)
      ))
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Secret not found" }, 404);
    }

    // Log the operation
    console.log(`Secret deleted via API: ${query.key} in environment ${query.environment} by client ${auth.clientName}`);

    return c.json({}, 200);

  } catch (error: any) {
    if (error instanceof Response) {
      throw error; // Re-throw HTTP responses from middleware
    }
    
    console.error("Error deleting secret:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Mount v1 routes
app.route("/api/v1", v1);

// Catch-all for unmatched routes
app.all("*", (c) => {
  return c.json({ error: "Not found" }, 404);
});

export default app;