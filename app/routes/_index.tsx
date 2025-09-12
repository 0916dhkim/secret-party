import { css } from "@flow-css/core/css";
import { db } from "../db/db";
import { requireAuth } from "../auth/session";
// No shared styles needed - all inlined
import type { Route } from "./+types/_index";

export async function loader(args: Route.LoaderArgs) {
  // Require authentication - will redirect to /login if not authenticated
  const session = await requireAuth(args.request);

  return { user: session.user };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div
      className={css({
        padding: "2rem",
      })}
    >
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        })}
      >
        <h1>Welcome to Secret Party</h1>
        <div>
          <span
            className={css({
              marginRight: "1rem",
            })}
          >
            Logged in as: {loaderData.user.email}
          </span>
          <a
            href="/logout"
            className={css({
              padding: "0.75rem",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              textDecoration: "none",
              "&:hover": {
                backgroundColor: "#c82333",
              },
            })}
          >
            Logout
          </a>
        </div>
      </div>

      <div
        className={css({
          background: "#f8f9fa",
          padding: "1rem",
          borderRadius: "4px",
        })}
      >
        <p>You are successfully authenticated!</p>
      </div>
    </div>
  );
}
