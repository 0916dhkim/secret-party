import { Hono, Context, Next } from "hono";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "@secret-party/database/db";
import {
  apiClientTable,
  environmentAccessTable,
  environmentTable,
  secretTable,
} from "@secret-party/database/schema";
import { logAuditEvent } from "@secret-party/audit/logger";

type ApiVariables = {
  apiClient: typeof apiClientTable.$inferSelect;
};

type EnvironmentRouteVariables = {
  environmentAccess: typeof environmentAccessTable.$inferSelect;
};

async function authorizationMiddleware(
  c: Context<{ Variables: ApiVariables }>,
  next: Next,
) {
  const authHeader = c.req.header("Authorization");

  if (authHeader == null) {
    await logAuditEvent({
      action: "api_auth_failure",
      details: { reason: "missing_header" },
    });
    return c.json({ error: "Authorization header required" }, 401);
  }

  const match = authHeader.match(/^Bearer\s+(?<publicKey>.+)$/);
  if (match == null) {
    await logAuditEvent({
      action: "api_auth_failure",
      details: { reason: "invalid_header_format" },
    });
    return c.json(
      {
        error:
          "Invalid Authorization header format. Expected: Bearer <public_key>",
      },
      401,
    );
  }

  const publicKey = match.groups?.publicKey;

  if (publicKey == null) {
    await logAuditEvent({
      action: "api_auth_failure",
      details: { reason: "empty_public_key" },
    });
    return c.json({ error: "Public key cannot be empty" }, 401);
  }

  const apiClient = await db.query.apiClientTable.findFirst({
    where: eq(apiClientTable.publicKey, publicKey),
  });

  if (apiClient == null) {
    await logAuditEvent({
      action: "api_auth_failure",
      details: { reason: "invalid_public_key" },
    });
    return c.json({ error: "Invalid public key" }, 401);
  }

  c.set("apiClient", apiClient);

  await next();
}

async function environmentAccessMiddleware(
  c: Context<{ Variables: ApiVariables & EnvironmentRouteVariables }>,
  next: Next,
) {
  const environmentId = c.req.param("environmentId");
  const apiClient = c.get("apiClient");

  const access = await db.query.environmentAccessTable.findFirst({
    where: and(
      eq(environmentAccessTable.clientId, apiClient.id),
      eq(environmentAccessTable.environmentId, Number(environmentId)),
    ),
  });

  if (access == null) {
    await logAuditEvent({
      action: "api_access_denied",
      apiClientId: apiClient.id,
      details: { environmentId: Number(environmentId) },
    });
    return c.json(
      {
        error: "Forbidden",
      },
      403,
    );
  }

  c.set("environmentAccess", access);

  return next();
}

function buildPublicApiServer() {
  const environmentRoute = new Hono<{
    Variables: ApiVariables & EnvironmentRouteVariables;
  }>()
    .use(environmentAccessMiddleware)
    .get(
      "/",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
        }),
      ),
      async (c) => {
        const { environmentId } = c.req.valid("param");

        const environment = await db.query.environmentTable.findFirst({
          where: eq(environmentTable.id, environmentId),
        });

        return c.json({ environment });
      },
    )

    .get(
      "/secrets",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
        }),
      ),
      async (c) => {
        const { environmentId } = c.req.valid("param");
        const apiClient = c.get("apiClient");

        const environment = await db.query.environmentTable.findFirst({
          where: eq(environmentTable.id, environmentId),
          with: {
            secrets: {
              columns: { key: true },
            },
          },
        });

        if (environment == null) {
          return c.json({ error: "Environment not found" }, 404);
        }

        const secretKeys = environment.secrets.map((secret) => secret.key);

        await logAuditEvent({
          action: "api_secret_list",
          apiClientId: apiClient.id,
          details: { environmentId },
        });

        return c.json({
          secretKeys,
        });
      },
    )

    .get(
      "/secrets/:key",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
          key: z.string(),
        }),
      ),
      async (c) => {
        const { environmentId, key } = c.req.valid("param");
        const { dekWrappedByClientPublicKey } = c.get("environmentAccess");
        const apiClient = c.get("apiClient");

        const secret = await db.query.secretTable.findFirst({
          where: and(
            eq(secretTable.environmentId, environmentId),
            eq(secretTable.key, key),
          ),
          columns: {
            key: true,
            valueEncrypted: true,
          },
        });

        if (secret == null) {
          return c.json({ error: "Secret not found" }, 404);
        }

        await logAuditEvent({
          action: "api_secret_get",
          apiClientId: apiClient.id,
          details: { environmentId, secretKey: key },
        });

        return c.json({
          ...secret,
          dekWrappedByClientPublicKey,
        });
      },
    )

    .post(
      "/secrets/:key",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
          key: z.string(),
        }),
      ),
      zValidator(
        "json",
        z.object({
          valueEncrypted: z.string(),
        }),
      ),
      async (c) => {
        const { environmentId, key } = c.req.valid("param");
        const { valueEncrypted } = c.req.valid("json");
        const apiClient = c.get("apiClient");

        const existingSecret = await db.query.secretTable.findFirst({
          where: and(
            eq(secretTable.environmentId, environmentId),
            eq(secretTable.key, key),
          ),
        });

        if (existingSecret) {
          return c.json(
            { error: "Secret key already exists in this environment" },
            409,
          );
        }

        await db.insert(secretTable).values({
          environmentId,
          key,
          valueEncrypted,
        });

        await logAuditEvent({
          action: "secret_create",
          apiClientId: apiClient.id,
          details: { environmentId, secretKey: key },
        });

        return c.body(null, 201);
      },
    )

    .put(
      "/secrets/:key",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
          key: z.string(),
        }),
      ),
      zValidator(
        "json",
        z.object({
          valueEncrypted: z.string(),
        }),
      ),
      async (c) => {
        const { environmentId, key } = c.req.valid("param");
        const { valueEncrypted } = c.req.valid("json");
        const apiClient = c.get("apiClient");

        const existingSecret = await db.query.secretTable.findFirst({
          where: and(
            eq(secretTable.environmentId, environmentId),
            eq(secretTable.key, key),
          ),
        });

        if (existingSecret == null) {
          return c.json({ error: "Secret not found" }, 404);
        }

        await db
          .update(secretTable)
          .set({ valueEncrypted })
          .where(
            and(
              eq(secretTable.environmentId, environmentId),
              eq(secretTable.key, key),
            ),
          );

        await logAuditEvent({
          action: "secret_update",
          apiClientId: apiClient.id,
          details: { environmentId, secretKey: key },
        });

        return c.body(null, 200);
      },
    )

    .delete(
      "/secrets/:key",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
          key: z.string(),
        }),
      ),
      async (c) => {
        const { environmentId, key } = c.req.valid("param");
        const apiClient = c.get("apiClient");

        const existingSecret = await db.query.secretTable.findFirst({
          where: and(
            eq(secretTable.environmentId, environmentId),
            eq(secretTable.key, key),
          ),
        });

        if (existingSecret == null) {
          return c.json({ error: "Secret not found" }, 404);
        }

        await db
          .delete(secretTable)
          .where(
            and(
              eq(secretTable.environmentId, environmentId),
              eq(secretTable.key, key),
            ),
          );

        await logAuditEvent({
          action: "secret_delete",
          apiClientId: apiClient.id,
          details: { environmentId, secretKey: key },
        });

        return c.body(null, 200);
      },
    );
  const v1 = new Hono<{ Variables: ApiVariables }>()
    .use(authorizationMiddleware)
    .get("/environments", async (c) => {
      const apiClient = c.get("apiClient");

      // Get all environments this API key has access to
      const accessRecords = await db.query.environmentAccessTable.findMany({
        where: eq(environmentAccessTable.clientId, apiClient.id),
        with: {
          environment: {
            with: {
              project: true,
            },
          },
        },
      });

      const environments = accessRecords.map((access) => ({
        id: access.environment.id,
        name: access.environment.name,
        projectId: access.environment.projectId,
        projectName: access.environment.project.name,
      }));

      return c.json({ environments });
    })
    .route("/environments/:environmentId", environmentRoute);

  const app = new Hono().basePath("/api").route("/v1", v1);
  return app;
}

export const publicApiServer = buildPublicApiServer();
