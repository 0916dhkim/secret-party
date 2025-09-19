import { createFileRoute } from "@tanstack/react-router";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";

export const Route = createFileRoute(
  "/projects/$projectId/environments/$environmentId"
)({
  component: EnvironmentDetail,
  loader: async ({ params }) =>
    await loader({
      data: {
        projectId: Number(params.projectId),
        environmentId: Number(params.environmentId),
      },
    }),
});

const loader = createServerFn({
  method: "GET",
})
  .validator(
    z.object({
      projectId: z.number(),
      environmentId: z.number(),
    })
  )
  .handler(async ({ data: { projectId, environmentId } }) => {
    const session = await requireAuth();

    // Mock data - replace with actual database queries
    const project = {
      id: projectId,
      name: `Project ${projectId}`,
    };

    const environment = {
      id: environmentId,
      name:
        environmentId === 1
          ? "Production"
          : environmentId === 2
          ? "Staging"
          : "Development",
      projectId,
      secrets: [
        {
          key: "DATABASE_URL",
          value: "••••••••",
          lastUpdated: "2 hours ago",
          updatedBy: "john@example.com",
        },
        {
          key: "API_SECRET_KEY",
          value: "••••••••",
          lastUpdated: "1 day ago",
          updatedBy: "jane@example.com",
        },
        {
          key: "REDIS_URL",
          value: "••••••••",
          lastUpdated: "3 days ago",
          updatedBy: "john@example.com",
        },
        {
          key: "STRIPE_SECRET_KEY",
          value: "••••••••",
          lastUpdated: "1 week ago",
          updatedBy: "admin@example.com",
        },
        {
          key: "JWT_SECRET",
          value: "••••••••",
          lastUpdated: "2 weeks ago",
          updatedBy: "jane@example.com",
        },
      ],
    };

    return { user: session.user, project, environment };
  });

function EnvironmentDetail() {
  const { user, project, environment } = Route.useLoaderData();

  return (
    <Layout userEmail={user.email}>
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Projects", path: "/projects" },
          { label: project.name, path: `/projects/${project.id}` },
          { label: environment.name },
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
              {environment.name} Environment
            </h1>
            <p className={css({ color: "#6b7280", fontSize: "1rem" })}>
              Manage secrets for the {environment.name.toLowerCase()}{" "}
              environment
            </p>
          </div>
          <div className={css({ display: "flex", gap: "1rem" })}>
            <button
              className={clsx(
                Styles.actionButton,
                css({
                  backgroundColor: "#f59e0b",
                  color: "white",
                })
              )}
            >
              Import Secrets
            </button>
            <button
              className={clsx(
                Styles.actionButton,
                css({
                  backgroundColor: "#3b82f6",
                  color: "white",
                })
              )}
            >
              + Add Secret
            </button>
          </div>
        </div>

        {/* Environment Info */}
        <div className={Styles.infoCard}>
          <div>
            <span className={css({ fontSize: "0.875rem", color: "#6b7280" })}>
              <strong>{environment.secrets.length}</strong> secrets total
            </span>
          </div>
          <div
            className={css({
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            })}
          >
            <input
              type="text"
              placeholder="Search secrets..."
              className={css({
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                minWidth: "200px",
              })}
            />
            <button
              className={clsx(
                Styles.smallButton,
                css({
                  backgroundColor: "#6b7280",
                  color: "white",
                  fontWeight: "500",
                })
              )}
            >
              Export
            </button>
          </div>
        </div>

        {/* Secrets Table */}
        <div className={Styles.tableContainer}>
          <div className={Styles.tableHeader}>
            <div>Secret Key</div>
            <div>Value</div>
            <div>Last Updated</div>
            <div>Updated By</div>
            <div>Actions</div>
          </div>

          {environment.secrets.map((secret, index) => (
            <div
              key={index}
              className={clsx(
                Styles.tableRow,
                index < environment.secrets.length - 1 &&
                  css({
                    borderBottom: "1px solid #f3f4f6",
                  })
              )}
            >
              <div>
                <code
                  className={css({
                    backgroundColor: "#f3f4f6",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    fontWeight: "500",
                  })}
                >
                  {secret.key}
                </code>
              </div>
              <div
                className={css({
                  fontFamily: "monospace",
                  color: "#6b7280",
                  fontSize: "0.75rem",
                })}
              >
                {secret.value}
              </div>
              <div className={css({ color: "#6b7280", fontSize: "0.75rem" })}>
                {secret.lastUpdated}
              </div>
              <div className={css({ color: "#6b7280", fontSize: "0.75rem" })}>
                {secret.updatedBy}
              </div>
              <div className={css({ display: "flex", gap: "0.5rem" })}>
                <button
                  className={clsx(
                    Styles.smallButton,
                    css({
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                    })
                  )}
                >
                  View
                </button>
                <button
                  className={clsx(
                    Styles.smallButton,
                    css({
                      backgroundColor: "#3b82f6",
                      color: "white",
                    })
                  )}
                >
                  Edit
                </button>
                <button
                  className={clsx(
                    Styles.smallButton,
                    css({
                      backgroundColor: "#fef2f2",
                      color: "#dc2626",
                    })
                  )}
                >
                  Delete
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
            This is a placeholder environment detail page. The actual
            implementation will show real secrets, allow secret management
            (create, read, update, delete), and provide search/filtering
            capabilities.
          </p>
        </div>
      </div>
    </Layout>
  );
}

const Styles = {
  actionButton: css({
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
  }),
  smallButton: css({
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
  }),
  infoCard: css({
    backgroundColor: "#f8f9fa",
    padding: "1rem",
    borderRadius: "6px",
    border: "1px solid #e9ecef",
    marginBottom: "2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }),
  tableContainer: css({
    backgroundColor: "white",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    marginBottom: "2rem",
  }),
  tableHeader: css({
    backgroundColor: "#f9fafb",
    padding: "0.75rem 1.5rem",
    borderBottom: "1px solid #e5e7eb",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    gap: "1rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  }),
  tableRow: css({
    padding: "1rem 1.5rem",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    gap: "1rem",
    alignItems: "center",
    fontSize: "0.875rem",
  }),
};
