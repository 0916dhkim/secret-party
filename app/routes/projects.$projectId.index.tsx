import { createFileRoute, Outlet } from "@tanstack/react-router";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectDetail,
  loader: async ({ params }) =>
    await loader({ data: { projectId: Number(params.projectId) } }),
});

const loader = createServerFn({ method: "GET" })
  .validator(
    z.object({
      projectId: z.number(),
    })
  )
  .handler(async ({ data: { projectId } }) => {
    const session = await requireAuth();

    // Mock project data - replace with actual database query
    const project = {
      id: projectId,
      name: `Project ${projectId}`,
      description: "This is a sample project description",
      environments: [
        {
          id: "1",
          name: "Production",
          secretCount: 24,
          lastUpdated: "2 hours ago",
        },
        { id: "2", name: "Staging", secretCount: 18, lastUpdated: "1 day ago" },
        {
          id: "3",
          name: "Development",
          secretCount: 12,
          lastUpdated: "3 days ago",
        },
      ],
    };

    return { user: session.user, project };
  });

function ProjectDetail() {
  const { user, project } = Route.useLoaderData();

  return (
    <Layout userEmail={user.email}>
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Projects", path: "/projects" },
          { label: project.name },
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
          <div>
            <h1
              className={css({
                fontSize: "2rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              })}
            >
              {project.name}
            </h1>
            <p className={css({ color: "#6b7280", fontSize: "1rem" })}>
              {project.description}
            </p>
          </div>
          <div className={css({ display: "flex", gap: "1rem" })}>
            <button className={Styles.secondaryButton}>Edit Project</button>
            <button className={Styles.primaryButton}>+ New Environment</button>
          </div>
        </div>

        {/* Project Stats */}
        <div
          className={css({
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            marginBottom: "3rem",
          })}
        >
          <div className={Styles.statCard}>
            <div
              className={css({
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#3b82f6",
              })}
            >
              {project.environments.length}
            </div>
            <div
              className={css({
                fontSize: "0.875rem",
                color: "#6b7280",
                marginTop: "0.5rem",
              })}
            >
              Environments
            </div>
          </div>
          <div className={Styles.statCard}>
            <div
              className={css({
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#10b981",
              })}
            >
              {project.environments.reduce(
                (sum: number, env: any) => sum + env.secretCount,
                0
              )}
            </div>
            <div
              className={css({
                fontSize: "0.875rem",
                color: "#6b7280",
                marginTop: "0.5rem",
              })}
            >
              Total Secrets
            </div>
          </div>
        </div>

        {/* Environments */}
        <h2
          className={css({
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "1.5rem",
          })}
        >
          Environments
        </h2>

        <div
          className={css({
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            marginBottom: "2rem",
          })}
        >
          {project.environments.map((environment: any) => (
            <div key={environment.id} className={Styles.environmentCard}>
              <div
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "1rem",
                })}
              >
                <h3
                  className={css({
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#111827",
                  })}
                >
                  {environment.name}
                </h3>
                <span
                  className={clsx(
                    css({
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                    }),
                    environment.name === "Production"
                      ? css({
                          backgroundColor: "#fef2f2",
                          color: "#dc2626",
                        })
                      : css({
                          backgroundColor: "#f0fdf4",
                          color: "#16a34a",
                        })
                  )}
                >
                  {environment.name}
                </span>
              </div>

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
                  <strong>{environment.secretCount}</strong> secrets
                </div>
                <div
                  className={css({ fontSize: "0.875rem", color: "#6b7280" })}
                >
                  Last updated: {environment.lastUpdated}
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
                    Styles.environmentActionButton,
                    css({
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                    })
                  )}
                >
                  Manage
                </button>
                <button
                  className={clsx(
                    Styles.environmentActionButton,
                    css({
                      backgroundColor: "#3b82f6",
                      color: "white",
                    })
                  )}
                  onClick={() => {
                    // This would navigate to the environment detail page
                    console.log(
                      `Navigate to /projects/${project.id}/environments/${environment.id}`
                    );
                  }}
                >
                  View Secrets
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
            This is a placeholder project detail page. The actual implementation
            will show real project data, allow project management, and provide
            navigation to environment-specific secret management.
          </p>
        </div>

        {/* Child routes (like environment details) will render here */}
        <Outlet />
      </div>
    </Layout>
  );
}

const Styles = {
  statCard: css({
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
    textAlign: "center",
  }),
  secondaryButton: css({
    backgroundColor: "#f3f4f6",
    color: "#374151",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    "&:hover": {
      backgroundColor: "#e5e7eb",
    },
  }),
  primaryButton: css({
    backgroundColor: "#10b981",
    color: "white",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    "&:hover": {
      backgroundColor: "#059669",
    },
  }),
  environmentCard: css({
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
  environmentActionButton: css({
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "500",
  }),
};
