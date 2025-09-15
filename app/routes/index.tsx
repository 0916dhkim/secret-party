import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { logout } from "../auth/actions";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async (a) => {
  const session = await requireAuth();
  return { user: session.user };
});

function Home() {
  const loaderData = Route.useLoaderData();
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
          <form action={logout.url} method="POST">
            <button
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
            </button>
          </form>
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
