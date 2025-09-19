import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import { PgliteDatabase } from "drizzle-orm/pglite";

const DRIZZLE_CONFIG = {
  casing: "snake_case",
  schema,
} as const;

declare global {
  /**
   * Global cache for in-memory db.
   *
   * To prevent re-creating db client on dev hot-reload.
   */
  var __pglite_db__: PgliteDatabase<typeof schema> | undefined;
}

async function buildDrizzle() {
  if (process.env.DATABASE_URL) {
    return drizzle(process.env.DATABASE_URL, DRIZZLE_CONFIG);
  } else {
    // Do not create another pglite db if there's already one in memory.
    if (globalThis.__pglite_db__ != null) {
      return globalThis.__pglite_db__;
    }
    const { drizzle: pgliteDrizzle } = await import("drizzle-orm/pglite");
    const { schema: _ignore, ...configWithoutSchema } = DRIZZLE_CONFIG;
    const inMemoryDb = new PGlite();
    await migrate(pgliteDrizzle(inMemoryDb, configWithoutSchema), {
      migrationsFolder: "./drizzle",
    });
    globalThis.__pglite_db__ = pgliteDrizzle(inMemoryDb, DRIZZLE_CONFIG);
    return globalThis.__pglite_db__;
  }
}

export const db = await buildDrizzle();
