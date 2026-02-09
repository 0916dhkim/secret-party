import "dotenv/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { LOCAL_DATABASE_URL } from "./local";

declare global {
  /**
   * Global cache for the drizzle db client.
   *
   * Prevents connection pool accumulation on dev hot-reload — without this,
   * each Vite HMR update re-executes this module and creates a new pg.Pool,
   * eventually exhausting postgres's max_connections limit.
   */
  var __db__: NodePgDatabase<typeof schema> | undefined;
}

function buildDrizzle() {
  return drizzle(process.env.DATABASE_URL ?? LOCAL_DATABASE_URL, {
    casing: "snake_case",
    schema,
  });
}

export const db = globalThis.__db__ ?? buildDrizzle();

if (process.env.NODE_ENV !== "production") {
  globalThis.__db__ = db;
}
