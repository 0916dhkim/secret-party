import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const common = {
  out: "./drizzle",
  schema: "./src/schema.ts",
  casing: "snake_case",
  dialect: "postgresql",
} as const;

const config = process.env.DATABASE_URL
  ? defineConfig({
      ...common,
      dbCredentials: {
        url: process.env.DATABASE_URL,
      },
    })
  : defineConfig({
      ...common,
      driver: "pglite",
    });

export default config;
