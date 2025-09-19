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
            <p className={css({ color: "#6b7280", fontSize: "0.875rem" })}>
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
              className={css({
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                "&:hover": { backgroundColor: "#2563eb" },
              })}
            >
              Create New Project
            </button>
            <button
              className={css({
                backgroundColor: "#10b981",
                color: "white",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                "&:hover": { backgroundColor: "#059669" },
              })}
            >
              Generate API Key
            </button>
          </div>
        </div>

        <div
          className={css({
            backgroundColor: "#f0f9ff",
            padding: "1rem",
            borderRadius: "6px",
            border: "1px solid #0ea5e9",
          })}
        >
          <p className={css({ color: "#0c4a6e", fontSize: "0.875rem" })}>
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
  card: css({
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  }),
  cardTitle: css({
    marginBottom: "1rem",
    fontSize: "1.25rem",
    fontWeight: "600",
  }),
};
