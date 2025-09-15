import { Hono } from "hono";

function buildPublicApiServer() {
  const app = new Hono().basePath("/api");
  app.get("/hello", (c) => c.text("world"));
  return app;
}

export const publicApiServer = buildPublicApiServer();
