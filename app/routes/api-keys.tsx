import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { db } from "../db/db";
import { eq } from "drizzle-orm";
import { apiClientTable } from "../db/schema";

export const Route = createFileRoute("/api-keys")({
  component: ApiKeys,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();

  const apiClients = await db.query.apiClientTable.findMany({
    where: eq(apiClientTable.userId, session.userId),
    with: {
      access: {
        with: {
          environment: true,
        },
      },
    },
  });

  return { user: session.user, apiClients };
});

function ApiKeys() {
  const loaderData = Route.useLoaderData();

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "API Keys" },
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
            API Keys
          </h1>
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
            + Generate API Key
          </button>
        </div>

        {/* API Keys Table */}
        <div className={Styles.tableContainer}>
          <div className={Styles.tableHeader}>
            <div>Name</div>
            <div>Environment</div>
            <div>Actions</div>
          </div>

          {/* Sample API Keys - these would be generated from data */}
          {loaderData.apiClients.map((apiClient, index) => (
            <div
              key={index}
              className={clsx(
                Styles.tableRow,
                index < 2 &&
                  css(({ v }) => ({
                    borderBottom: `1px solid ${v("--c-border")}`,
                  }))
              )}
            >
              <div>
                <div
                  className={css(({ v }) => ({
                    fontWeight: "500",
                    color: v("--c-text"),
                  }))}
                >
                  {apiClient.name}
                </div>
                <div
                  className={css(({ v }) => ({
                    fontSize: "0.75rem",
                    color: v("--c-text-muted"),
                    fontFamily: "monospace",
                  }))}
                >
                  {apiClient.publicKey}
                </div>
              </div>
              <div>
                <span
                  className={css(({ v }) => ({
                    backgroundColor: `oklch(from ${v(
                      "--c-success"
                    )} 0.9 0.05 h)`,
                    color: `oklch(from ${v("--c-success")} 0.25 c h)`,
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                  }))}
                >
                  {apiClient.access[0]?.environment.name}
                </span>
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
                  Copy
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
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Usage Instructions */}
        <div className={Styles.instructionsCard}>
          <h3 className={Styles.sectionTitle}>Using API Keys</h3>
          <div
            className={css(({ v }) => ({
              fontSize: "0.875rem",
              color: v("--c-text"),
              lineHeight: "1.5",
            }))}
          >
            <p className={css({ marginBottom: "0.5rem" })}>
              Include your API key in the Authorization header:
            </p>
            <code
              className={css(({ v }) => ({
                backgroundColor: v("--c-bg-light"),
                padding: "0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                display: "block",
                marginBottom: "1rem",
                border: `1px solid ${v("--c-border")}`,
              }))}
            >
              Authorization: Bearer sp_prod_your_api_key_here
            </code>
            <p>
              API keys provide access to the secrets within their assigned
              environment only. Keep your API keys secure and rotate them
              regularly.
            </p>
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
            This is a placeholder API keys page. The actual implementation will
            manage real API keys, allow key generation with environment
            selection, and provide secure key management features.
          </p>
        </div>
      </div>
    </Layout>
  );
}

const Styles = {
  tableContainer: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    boxShadow: v("--shadow"),
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
  smallButton: css({
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    transition: "all 0.2s",
  }),
  instructionsCard: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    boxShadow: v("--shadow"),
    padding: "1.5rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    marginBottom: "2rem",
  })),
  sectionTitle: css(({ v }) => ({
    fontSize: "1.125rem",
    fontWeight: "600",
    marginBottom: "1rem",
    color: v("--c-text"),
  })),
};
