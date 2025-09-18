import { Hono, Context, Next } from "hono";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/db";
import {
  apiClientTable,
  environmentAccessTable,
  environmentTable,
  secretTable,
} from "../db/schema";

type ApiVariables = {
  apiClient: typeof apiClientTable.$inferSelect;
};

type EnvironmentRouteVariables = {
  environmentAccess: typeof environmentAccessTable.$inferSelect;
};

async function authorizationMiddleware(
  c: Context<{ Variables: ApiVariables }>,
  next: Next
) {
  const authHeader = c.req.header("Authorization");

  if (authHeader == null) {
    return c.json({ error: "Authorization header required" }, 401);
  }

  const match = authHeader.match(/^Bearer\s+(?<publicKey>.+)$/);
  if (match == null) {
    return c.json(
      {
        error:
          "Invalid Authorization header format. Expected: Bearer <public_key>",
      },
      401
    );
  }

  const publicKey = match.groups?.publicKey;

  if (publicKey == null) {
    return c.json({ error: "Public key cannot be empty" }, 401);
  }

  const apiClient = await db.query.apiClientTable.findFirst({
    where: eq(apiClientTable.publicKey, publicKey),
  });

  if (apiClient == null) {
    return c.json({ error: "Invalid public key" }, 401);
  }

  c.set("apiClient", apiClient);

  await next();
}

async function environmentAccessMiddleware(
  c: Context<{ Variables: ApiVariables & EnvironmentRouteVariables }>,
  next: Next
) {
  const environmentId = c.req.param("environmentId");
  const apiClient = c.get("apiClient");

  const access = await db.query.environmentAccessTable.findFirst({
    where: and(
      eq(environmentAccessTable.clientId, apiClient.id),
      eq(environmentAccessTable.environmentId, Number(environmentId))
    ),
  });

  if (access == null) {
    return c.json(
      {
        error: "Forbidden",
      },
      403
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
        })
      ),
      async (c) => {
        const { environmentId } = c.req.valid("param");

        const environment = await db.query.environmentTable.findFirst({
          where: eq(environmentTable.id, environmentId),
        });

        return c.json({ environment });
      }
    )

    .get(
      "/secrets",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
        })
      ),
      async (c) => {
        const { environmentId } = c.req.valid("param");

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

        return c.json({
          secretKeys,
        });
      }
    )

    .get(
      "/secrets/:key",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
          key: z.string(),
        })
      ),
      async (c) => {
        const { environmentId, key } = c.req.valid("param");
        const { dekWrappedByClientPublicKey } = c.get("environmentAccess");

        const secret = await db.query.secretTable.findFirst({
          where: and(
            eq(secretTable.environmentId, environmentId),
            eq(secretTable.key, key)
          ),
          columns: {
            key: true,
            valueEncrypted: true,
          },
        });

        if (secret == null) {
          return c.json({ error: "Secret not found" }, 404);
        }

        return c.json({
          ...secret,
          dekWrappedByClientPublicKey,
        });
      }
    )

    .post(
      "/secrets/:key",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
          key: z.string(),
        })
      ),
      zValidator(
        "json",
        z.object({
          valueEncrypted: z.string(),
        })
      ),
      async (c) => {
        const { environmentId, key } = c.req.valid("param");
        const { valueEncrypted } = c.req.valid("json");

        const existingSecret = await db.query.secretTable.findFirst({
          where: and(
            eq(secretTable.environmentId, environmentId),
            eq(secretTable.key, key)
          ),
        });

        if (existingSecret) {
          return c.json(
            { error: "Secret key already exists in this environment" },
            409
          );
        }

        await db.insert(secretTable).values({
          environmentId,
          key,
          valueEncrypted,
        });

        return c.body(null, 201);
      }
    )

    .put(
      "/secrets/:key",
      zValidator(
        "param",
        z.object({
          environmentId: z.coerce.number(),
          key: z.string(),
        })
      ),
      zValidator(
        "json",
        z.object({
          valueEncrypted: z.string(),
        })
      ),
      async (c) => {
        const { environmentId, key } = c.req.valid("param");
        const { valueEncrypted } = c.req.valid("json");

        const existingSecret = await db.query.secretTable.findFirst({
          where: and(
            eq(secretTable.environmentId, environmentId),
            eq(secretTable.key, key)
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
              eq(secretTable.key, key)
            )
          );

        return c.body(null, 200);
      }
    );
  const v1 = new Hono<{ Variables: ApiVariables }>()
    .use(authorizationMiddleware)
    .route("/environments/:environmentId", environmentRoute);

  const app = new Hono().basePath("/api").route("/v1", v1);
  return app;
}

export const publicApiServer = buildPublicApiServer();
