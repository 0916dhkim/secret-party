import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  return { user: session.user };
});

function Dashboard() {
  const loaderData = Route.useLoaderData();

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      <div className={mainContent}>
        <h1
          className={css({
            marginBottom: "2rem",
            fontSize: "2rem",
            fontWeight: "bold",
          })}
        >
          Dashboard
        </h1>

        <div
          className={css({
            display: "grid",
            gap: "2rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            marginBottom: "2rem",
          })}
        >
          {/* Quick Stats */}
          <div className={Styles.card}>
            <h3 className={Styles.cardTitle}>Quick Stats</h3>
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              })}
            >
              <div>
                Projects: <strong>0</strong>
              </div>
              <div>
                Total Secrets: <strong>0</strong>
              </div>
              <div>
                API Keys: <strong>0</strong>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={Styles.card}>
            <h3 className={Styles.cardTitle}>Recent Activity</h3>
            <p
              className={css(({ v }) => ({
                color: v("--c-text-muted"),
                fontSize: "0.875rem",
              }))}
            >
              No recent activity
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={css({ marginBottom: "2rem" })}>
          <h3 className={Styles.cardTitle}>Quick Actions</h3>
          <div
            className={css({ display: "flex", gap: "1rem", flexWrap: "wrap" })}
          >
            <button
              className={css(({ v }) => ({
                backgroundColor: v("--c-primary"),
                color: v("--c-text-alt"),
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                "&:hover": {
                  backgroundColor: `oklch(from ${v(
                    "--c-primary"
                  )} calc(l - 0.05) c h)`,
                },
              }))}
            >
              Create New Project
            </button>
            <button
              className={css(({ v }) => ({
                backgroundColor: v("--c-success"),
                color: v("--c-text-alt"),
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                "&:hover": {
                  backgroundColor: `oklch(from ${v(
                    "--c-success"
                  )} calc(l - 0.05) c h)`,
                },
              }))}
            >
              Generate API Key
            </button>
          </div>
        </div>

        <div
          className={css(({ v }) => ({
            backgroundColor: `oklch(from ${v("--c-info")} 0.85 0.1 h)`,
            padding: "1rem",
            borderRadius: "6px",
            border: `1px solid ${v("--c-info")}`,
          }))}
        >
          <p
            className={css(({ v }) => ({
              color: `oklch(from ${v("--c-info")} 0.3 c h)`,
              fontSize: "0.875rem",
            }))}
          >
            Welcome to Secret Party! This is a placeholder dashboard page. The
            actual implementation will show your projects, recent activity, and
            quick actions.
          </p>
        </div>
      </div>
    </Layout>
  );
}

const Styles = {
  card: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    boxShadow: v("--shadow"),
    padding: "1.5rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
  })),
  cardTitle: css({
    marginBottom: "1rem",
    fontSize: "1.25rem",
    fontWeight: "600",
  }),
};
