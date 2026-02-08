import { execSync, spawn } from "node:child_process";
import pg from "pg";
import { localDb } from "./src/local";

async function waitForPostgres(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const client = new pg.Client({
      host: localDb.host,
      port: localDb.port,
      user: localDb.user,
      password: localDb.password,
      database: localDb.database,
    });
    try {
      await client.connect();
      await client.end();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `Timed out waiting for Postgres on ${localDb.host}:${localDb.port}`,
  );
}

function startPostgres() {
  const docker = spawn(
    "docker",
    [
      "run",
      "--rm",
      "-e",
      `POSTGRES_USER=${localDb.user}`,
      "-e",
      `POSTGRES_PASSWORD=${localDb.password}`,
      "-e",
      `POSTGRES_DB=${localDb.database}`,
      "-p",
      `${localDb.port}:5432`,
      "postgres",
      "-c",
      "log_statement=all",
    ],
    { stdio: "inherit" },
  );

  docker.on("error", (err) => {
    console.error("Failed to start Docker:", err);
    process.exit(1);
  });

  docker.on("exit", (code) => {
    process.exit(code ?? 1);
  });

  process.on("SIGINT", () => docker.kill("SIGINT"));
  process.on("SIGTERM", () => docker.kill("SIGTERM"));
}

async function main() {
  startPostgres();
  await waitForPostgres();
  console.log("Postgres is ready. Running migrations...");
  execSync("pnpm drizzle-kit migrate", { stdio: "inherit" });
  console.log("Migrations complete.");
}

main();
