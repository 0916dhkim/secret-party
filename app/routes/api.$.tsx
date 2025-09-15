import { createFileRoute } from "@tanstack/react-router"
import { createAPIFileRoute } from "@tanstack/react-start";
import honoApp from "../api/hono-server";

// This route handles all /api/* requests through Hono
export const Route = createAPIFileRoute("/api/$")({
  GET: ({ request }) => honoApp.fetch(request),
  POST: ({ request }) => honoApp.fetch(request),
  PUT: ({ request }) => honoApp.fetch(request),
  DELETE: ({ request }) => honoApp.fetch(request),
  PATCH: ({ request }) => honoApp.fetch(request),
});