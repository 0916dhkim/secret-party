import { createFileRoute } from "@tanstack/react-router";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { db } from "../db/db";
import { and, eq } from "drizzle-orm";
import { environmentTable, projectTable } from "../db/schema";

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

    const environment = await db.query.environmentTable.findFirst({
      where: and(
        eq(environmentTable.id, environmentId),
        eq(environmentTable.projectId, projectId)
      ),
      with: {
        project: {
          columns: {
            id: true,
            name: true,
          },
        },
        secrets: {
          columns: {
            key: true,
            valueEncrypted: true,
          },
        },
      },
    });
    console.log(projectId, environmentId);
    console.log(environment);

    if (environment == null) {
      throw new Error("Environment not found", { cause: { status: 404 } });
    }

    return { user: session.user, environment };
  });

function EnvironmentDetail() {
  const { user, environment } = Route.useLoaderData();

  return (
    <Layout userEmail={user.email}>
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Projects", path: "/projects" },
          {
            label: environment.project.name,
            path: `/projects/${environment.project.id}`,
          },
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
            <p
              className={css(({ v }) => ({
                color: v("--c-text-muted"),
                fontSize: "1rem",
              }))}
            >
              Manage secrets for the {environment.name.toLowerCase()}{" "}
              environment
            </p>
          </div>
          <div className={css({ display: "flex", gap: "1rem" })}>
            <button
              className={clsx(
                Styles.actionButton,
                css(({ v }) => ({
                  backgroundColor: v("--c-warning"),
                  color: v("--c-text-alt"),
                  "&:hover": {
                    backgroundColor: `oklch(from ${v(
                      "--c-warning"
                    )} calc(l - 0.05) c h)`,
                  },
                }))
              )}
            >
              Import Secrets
            </button>
            <button
              className={clsx(
                Styles.actionButton,
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
              + Add Secret
            </button>
          </div>
        </div>

        {/* Environment Info */}
        <div className={Styles.infoCard}>
          <div>
            <span
              className={css(({ v }) => ({
                fontSize: "0.875rem",
                color: v("--c-text-muted"),
              }))}
            >
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
              className={css(({ v }) => ({
                padding: "0.5rem 0.75rem",
                border: `1px solid ${v("--c-border")}`,
                borderRadius: "6px",
                fontSize: "0.875rem",
                minWidth: "200px",
                backgroundColor: v("--c-bg-light"),
                color: v("--c-text"),
              }))}
            />
            <button
              className={clsx(
                Styles.smallButton,
                css(({ v }) => ({
                  backgroundColor: `oklch(from ${v("--c-text")} l 0.3 h)`,
                  color: v("--c-text-alt"),
                  fontWeight: "500",
                  "&:hover": {
                    backgroundColor: `oklch(from ${v("--c-text")} l 0.25 h)`,
                  },
                }))
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
            <div>Actions</div>
          </div>

          {environment.secrets.map((secret, index) => (
            <div
              key={index}
              className={clsx(
                Styles.tableRow,
                index < environment.secrets.length - 1 &&
                  css(({ v }) => ({
                    borderBottom: `1px solid ${v("--c-border")}`,
                  }))
              )}
            >
              <div>
                <code
                  className={css(({ v }) => ({
                    backgroundColor: v("--c-bg-light"),
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    fontWeight: "500",
                    border: `1px solid ${v("--c-border")}`,
                  }))}
                >
                  {secret.key}
                </code>
              </div>
              <div
                className={css(({ v }) => ({
                  fontFamily: "monospace",
                  color: v("--c-text-muted"),
                  fontSize: "0.75rem",
                }))}
              >
                {secret.valueEncrypted}
              </div>
              <div className={css({ display: "flex", gap: "0.5rem" })}>
                <button
                  className={clsx(
                    Styles.smallButton,
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
                  View
                </button>
                <button
                  className={clsx(
                    Styles.smallButton,
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
                  Edit
                </button>
                <button
                  className={clsx(
                    Styles.smallButton,
                    css(({ v }) => ({
                      backgroundColor: `oklch(from ${v(
                        "--c-danger"
                      )} 0.95 0.05 h)`,
                      color: v("--c-danger"),
                      "&:hover": {
                        backgroundColor: `oklch(from ${v(
                          "--c-danger"
                        )} 0.9 0.1 h)`,
                      },
                    }))
                  )}
                >
                  Delete
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
    transition: "all 0.2s",
  }),
  smallButton: css({
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    transition: "all 0.2s",
  }),
  infoCard: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    padding: "1rem",
    borderRadius: "6px",
    border: `1px solid ${v("--c-border")}`,
    marginBottom: "2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  })),
  tableContainer: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    overflow: "hidden",
    marginBottom: "2rem",
  })),
  tableHeader: css(({ v }) => ({
    backgroundColor: v("--c-bg-light"),
    padding: "0.75rem 1.5rem",
    borderBottom: `1px solid ${v("--c-border")}`,
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    gap: "1rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: v("--c-text"),
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  })),
  tableRow: css({
    padding: "1rem 1.5rem",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    gap: "1rem",
    alignItems: "center",
    fontSize: "0.875rem",
  }),
};
