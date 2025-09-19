import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";

export const Route = createFileRoute("/projects/")({
  component: Projects,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  return { user: session.user };
});

function Projects() {
  const loaderData = Route.useLoaderData();

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Projects" },
        ]}
      />
      <div className={mainContent}>
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          })}
        >
          <h1 className={css({ fontSize: "2rem", fontWeight: "bold" })}>
            Projects
          </h1>
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
              "&:hover": {
                backgroundColor: "#2563eb",
              },
            })}
          >
            + New Project
          </button>
        </div>

        {/* Projects Grid */}
        <div
          className={css({
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            marginBottom: "2rem",
          })}
        >
          {/* Sample Project Cards - these would be generated from data */}
          {[
            {
              name: "Production App",
              environments: 3,
              secrets: 24,
              lastUpdated: "2 days ago",
            },
            {
              name: "Staging Environment",
              environments: 2,
              secrets: 18,
              lastUpdated: "5 days ago",
            },
            {
              name: "Development",
              environments: 1,
              secrets: 12,
              lastUpdated: "1 week ago",
            },
          ].map((project, index) => (
            <div key={index} className={Styles.projectCard}>
              <h3
                className={css({
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#111827",
                })}
              >
                {project.name}
              </h3>
              <div
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                })}
              >
                <div
                  className={css({ fontSize: "0.875rem", color: "#6b7280" })}
                >
                  <strong>{project.environments}</strong> environments
                </div>
                <div
                  className={css({ fontSize: "0.875rem", color: "#6b7280" })}
                >
                  <strong>{project.secrets}</strong> secrets total
                </div>
                <div
                  className={css({ fontSize: "0.875rem", color: "#6b7280" })}
                >
                  Last updated: {project.lastUpdated}
                </div>
              </div>
              <div
                className={css({
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                })}
              >
                <button
                  className={clsx(
                    Styles.cardButton,
                    css({
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                    })
                  )}
                >
                  Edit
                </button>
                <button
                  className={clsx(
                    Styles.cardButton,
                    css({
                      backgroundColor: "#3b82f6",
                      color: "white",
                    })
                  )}
                >
                  View
                </button>
              </div>
            </div>
          ))}
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
            This is a placeholder projects page. The actual implementation will
            show your real projects, allow creating new projects, and provide
            navigation to project details and environments.
          </p>
        </div>
      </div>
    </Layout>
  );
}

const Styles = {
  projectCard: css({
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    },
  }),
  cardButton: css({
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "500",
  }),
};
