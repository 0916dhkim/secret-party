import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

const DRIZZLE_CONFIG = {
  casing: "snake_case",
  schema,
} as const;

async function buildDrizzle() {
  if (process.env.DATABASE_URL) {
    return drizzle(process.env.DATABASE_URL, DRIZZLE_CONFIG);
  } else {
    const { drizzle: pgliteDrizzle } = await import("drizzle-orm/pglite");
    const { schema: _ignore, ...configWithoutSchema } = DRIZZLE_CONFIG;
    const inMemoryDb = new PGlite();
    await migrate(pgliteDrizzle(inMemoryDb, configWithoutSchema), {
      migrationsFolder: "./drizzle",
    });
    return pgliteDrizzle(inMemoryDb, DRIZZLE_CONFIG);
  }
}

export const db = await buildDrizzle();
