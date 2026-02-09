import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { LOCAL_DATABASE_URL } from "./src/local";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  casing: "snake_case",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
  },
});
