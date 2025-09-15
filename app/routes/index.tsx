import { requireAuth } from "../auth/session";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/")({
  component: () => null, // This component will never render due to redirect
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  // Require authentication first
  await requireAuth();
  // Then redirect to dashboard
  throw redirect({ to: "/dashboard" });
});
