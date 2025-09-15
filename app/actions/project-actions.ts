import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { db } from "../db/db";
import { eq, and } from "drizzle-orm";
import { projectTable, environmentTable, secretTable } from "../db/schema";
import { requireAuth } from "../auth/session";
import { requirePasswordConfirmation } from "../auth/password-verification";
import { generateDEK, encryptDEKWithPassword } from "../crypto/dek";
import { encryptSecret } from "../crypto/secrets";
import { z } from "zod";

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  password: z.string().min(1, "Password is required"),
});

const createEnvironmentSchema = z.object({
  name: z.string().min(1, "Environment name is required").max(50, "Environment name too long"),
  projectId: z.number().int().positive("Invalid project ID"),
  password: z.string().min(1, "Password is required"),
});

const createSecretSchema = z.object({
  key: z.string().min(1, "Secret key is required").max(200, "Secret key too long"),
  value: z.string().min(1, "Secret value is required").max(10000, "Secret value too long"),
  environmentId: z.number().int().positive("Invalid environment ID"),
  projectId: z.number().int().positive("Invalid project ID"),
  password: z.string().min(1, "Password is required"),
});

const updateSecretSchema = z.object({
  key: z.string().min(1, "Secret key is required").max(200, "Secret key too long"),
  value: z.string().min(1, "Secret value is required").max(10000, "Secret value too long"),
  environmentId: z.number().int().positive("Invalid environment ID"),
  projectId: z.number().int().positive("Invalid project ID"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Create a new project
 */
export const createProject = createServerFn({ method: "POST" })
  .validator((data: unknown) => createProjectSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    await requirePasswordConfirmation(data.password);

    try {
      // Create project
      const [project] = await db
        .insert(projectTable)
        .values({
          ownerId: session.user.id,
        })
        .returning();

      if (!project) {
        throw new Error("Failed to create project");
      }

      console.log(`Project created: ${project.id} by user ${session.user.email}`);

      return {
        success: true,
        projectId: project.id,
      };
    } catch (error: any) {
      console.error("Error creating project:", error);
      throw new Error("Failed to create project");
    }
  });

/**
 * Create a new environment in a project
 */
export const createEnvironment = createServerFn({ method: "POST" })
  .validator((data: unknown) => createEnvironmentSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    await requirePasswordConfirmation(data.password);

    try {
      // Verify project ownership
      const project = await db.query.projectTable.findFirst({
        where: and(
          eq(projectTable.id, data.projectId),
          eq(projectTable.ownerId, session.user.id)
        ),
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // Generate DEK for this environment
      const dek = generateDEK();
      
      // Encrypt DEK with user's password
      const dekEncrypted = encryptDEKWithPassword(dek, data.password);

      // Create environment
      const [environment] = await db
        .insert(environmentTable)
        .values({
          name: data.name,
          projectId: data.projectId,
          dekWrappedByPassword: dekEncrypted,
        })
        .returning();

      if (!environment) {
        throw new Error("Failed to create environment");
      }

      // Clear sensitive data from memory
      dek.fill(0);

      console.log(`Environment created: ${environment.name} (${environment.id}) in project ${data.projectId} by user ${session.user.email}`);

      return {
        success: true,
        environmentId: environment.id,
      };
    } catch (error: any) {
      console.error("Error creating environment:", error);
      throw new Error(error.message || "Failed to create environment");
    }
  });

/**
 * Create a new secret in an environment
 */
export const createSecret = createServerFn({ method: "POST" })
  .validator((data: unknown) => createSecretSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    await requirePasswordConfirmation(data.password);

    try {
      // Verify environment access through project ownership
      const environment = await db.query.environmentTable.findFirst({
        where: eq(environmentTable.id, data.environmentId),
        with: {
          project: true,
        },
      });

      if (!environment || environment.project.ownerId !== session.user.id) {
        throw new Error("Environment not found or access denied");
      }

      // Check if secret key already exists
      const existingSecret = await db.query.secretTable.findFirst({
        where: and(
          eq(secretTable.environmentId, data.environmentId),
          eq(secretTable.key, data.key)
        ),
      });

      if (existingSecret) {
        throw new Error("A secret with this key already exists");
      }

      // Decrypt environment DEK with password
      const { decryptDEKWithPassword } = await import("../crypto/dek");
      const dek = decryptDEKWithPassword(environment.dekWrappedByPassword, data.password);

      // Encrypt secret value with DEK
      const encryptedValue = encryptSecret(data.value, dek);

      // Create secret
      await db.insert(secretTable).values({
        environmentId: data.environmentId,
        key: data.key,
        valueEncrypted: encryptedValue,
      });

      // Clear sensitive data from memory
      dek.fill(0);

      console.log(`Secret created: ${data.key} in environment ${data.environmentId} by user ${session.user.email}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error creating secret:", error);
      throw new Error(error.message || "Failed to create secret");
    }
  });

/**
 * Update an existing secret
 */
export const updateSecret = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateSecretSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    await requirePasswordConfirmation(data.password);

    try {
      // Verify environment access through project ownership
      const environment = await db.query.environmentTable.findFirst({
        where: eq(environmentTable.id, data.environmentId),
        with: {
          project: true,
        },
      });

      if (!environment || environment.project.ownerId !== session.user.id) {
        throw new Error("Environment not found or access denied");
      }

      // Check if secret exists
      const existingSecret = await db.query.secretTable.findFirst({
        where: and(
          eq(secretTable.environmentId, data.environmentId),
          eq(secretTable.key, data.key)
        ),
      });

      if (!existingSecret) {
        throw new Error("Secret not found");
      }

      // Decrypt environment DEK with password
      const { decryptDEKWithPassword } = await import("../crypto/dek");
      const dek = decryptDEKWithPassword(environment.dekWrappedByPassword, data.password);

      // Encrypt secret value with DEK
      const encryptedValue = encryptSecret(data.value, dek);

      // Update secret
      await db.update(secretTable)
        .set({ valueEncrypted: encryptedValue })
        .where(and(
          eq(secretTable.environmentId, data.environmentId),
          eq(secretTable.key, data.key)
        ));

      // Clear sensitive data from memory
      dek.fill(0);

      console.log(`Secret updated: ${data.key} in environment ${data.environmentId} by user ${session.user.email}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error updating secret:", error);
      throw new Error(error.message || "Failed to update secret");
    }
  });

/**
 * Delete a secret
 */
export const deleteSecret = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    key: z.string().min(1, "Secret key is required"),
    environmentId: z.number().int().positive("Invalid environment ID"),
    projectId: z.number().int().positive("Invalid project ID"),
    password: z.string().min(1, "Password is required"),
  }).parse(data))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    await requirePasswordConfirmation(data.password);

    try {
      // Verify environment access through project ownership
      const environment = await db.query.environmentTable.findFirst({
        where: eq(environmentTable.id, data.environmentId),
        with: {
          project: true,
        },
      });

      if (!environment || environment.project.ownerId !== session.user.id) {
        throw new Error("Environment not found or access denied");
      }

      // Delete secret
      const result = await db.delete(secretTable)
        .where(and(
          eq(secretTable.environmentId, data.environmentId),
          eq(secretTable.key, data.key)
        ))
        .returning();

      if (result.length === 0) {
        throw new Error("Secret not found");
      }

      console.log(`Secret deleted: ${data.key} in environment ${data.environmentId} by user ${session.user.email}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting secret:", error);
      throw new Error(error.message || "Failed to delete secret");
    }
  });

/**
 * Get decrypted secret value (for viewing)
 */
export const getSecretValue = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    key: z.string().min(1, "Secret key is required"),
    environmentId: z.number().int().positive("Invalid environment ID"),
    projectId: z.number().int().positive("Invalid project ID"),
    password: z.string().min(1, "Password is required"),
  }).parse(data))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    await requirePasswordConfirmation(data.password);

    try {
      // Verify environment access through project ownership
      const environment = await db.query.environmentTable.findFirst({
        where: eq(environmentTable.id, data.environmentId),
        with: {
          project: true,
        },
      });

      if (!environment || environment.project.ownerId !== session.user.id) {
        throw new Error("Environment not found or access denied");
      }

      // Get secret
      const secret = await db.query.secretTable.findFirst({
        where: and(
          eq(secretTable.environmentId, data.environmentId),
          eq(secretTable.key, data.key)
        ),
      });

      if (!secret) {
        throw new Error("Secret not found");
      }

      // Decrypt environment DEK with password
      const { decryptDEKWithPassword } = await import("../crypto/dek");
      const dek = decryptDEKWithPassword(environment.dekWrappedByPassword, data.password);

      // Decrypt secret value
      const { decryptSecret } = await import("../crypto/secrets");
      const decryptedValue = decryptSecret(secret.valueEncrypted, dek);

      // Clear sensitive data from memory
      dek.fill(0);

      console.log(`Secret viewed: ${data.key} in environment ${data.environmentId} by user ${session.user.email}`);

      return {
        success: true,
        key: secret.key,
        value: decryptedValue,
      };
    } catch (error: any) {
      console.error("Error getting secret value:", error);
      throw new Error(error.message || "Failed to decrypt secret");
    }
  });