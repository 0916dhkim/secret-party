import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { LOCAL_DATABASE_URL } from "./local";

export const db = drizzle(process.env.DATABASE_URL ?? LOCAL_DATABASE_URL, {
  casing: "snake_case",
  schema,
});
