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
                className={css(({ v }) => ({
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: v("--c-text"),
                }))}
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
                  className={css(({ v }) => ({
                    fontSize: "0.875rem",
                    color: v("--c-text-muted"),
                  }))}
                >
                  <strong>{project.environments}</strong> environments
                </div>
                <div
                  className={css(({ v }) => ({
                    fontSize: "0.875rem",
                    color: v("--c-text-muted"),
                  }))}
                >
                  <strong>{project.secrets}</strong> secrets total
                </div>
                <div
                  className={css(({ v }) => ({
                    fontSize: "0.875rem",
                    color: v("--c-text-muted"),
                  }))}
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
                    css(({ v }) => ({
                      backgroundColor: v("--c-bg-light"),
                      color: v("--c-text"),
                      "&:hover": {
                        backgroundColor: `oklch(from ${v(
                          "--c-bg-light"
                        )} calc(l - 0.05) c h)`,
                      },
                    }))
                  )}
                >
                  Edit
                </button>
                <button
                  className={clsx(
                    Styles.cardButton,
                    css(({ v }) => ({
                      backgroundColor: v("--c-primary"),
                      color: v("--c-text-alt"),
                      "&:hover": {
                        backgroundColor: `oklch(from ${v(
                          "--c-primary"
                        )} calc(l - 0.05) c h)`,
                      },
                    }))
                  )}
                >
                  View
                </button>
              </div>
            </div>
          ))}
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
  projectCard: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    padding: "1.5rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    boxShadow: v("--shadow"),
    cursor: "pointer",
    transition: "all 0.2s",
  })),
  cardButton: css({
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "500",
    transition: "all 0.2s",
  }),
};
