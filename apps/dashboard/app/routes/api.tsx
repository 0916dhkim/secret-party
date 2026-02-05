import { createServerFileRoute } from "@tanstack/react-start/server";
import { publicApiServer } from "@secret-party/api/server";

export const ServerRoute = createServerFileRoute("/api").methods({
  GET: async ({ request }) => publicApiServer.fetch(request),
  POST: async ({ request }) => publicApiServer.fetch(request),
  PUT: async ({ request }) => publicApiServer.fetch(request),
  DELETE: async ({ request }) => publicApiServer.fetch(request),
  OPTIONS: async ({ request }) => publicApiServer.fetch(request),
  HEAD: async ({ request }) => publicApiServer.fetch(request),
  PATCH: async ({ request }) => publicApiServer.fetch(request),
});
