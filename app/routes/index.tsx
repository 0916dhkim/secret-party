import { requireAuth } from "../auth/session";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  // Redirect authenticated users to dashboard
  throw redirect({
    to: "/dashboard",
  });
});

function Home() {
  // This component will never render due to the redirect in the loader
  return <div>Redirecting...</div>;
}
