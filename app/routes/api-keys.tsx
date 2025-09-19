import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";

export const Route = createFileRoute("/api-keys")({
  component: ApiKeys,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  return { user: session.user };
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
            className={css({
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
            })}
          >
            + Generate API Key
          </button>
        </div>

        {/* API Keys Table */}
        <div className={Styles.tableContainer}>
          <div className={Styles.tableHeader}>
            <div>Name</div>
            <div>Environment</div>
            <div>Created</div>
            <div>Last Used</div>
            <div>Actions</div>
          </div>

          {/* Sample API Keys - these would be generated from data */}
          {[
            {
              name: "Production API Key",
              environment: "Production",
              created: "2024-01-15",
              lastUsed: "2 hours ago",
              keyPrefix: "sp_prod_",
            },
            {
              name: "Staging API Key",
              environment: "Staging",
              created: "2024-01-10",
              lastUsed: "1 day ago",
              keyPrefix: "sp_stag_",
            },
            {
              name: "Dev Testing Key",
              environment: "Development",
              created: "2024-01-05",
              lastUsed: "1 week ago",
              keyPrefix: "sp_dev_",
            },
          ].map((apiKey, index) => (
            <div
              key={index}
              className={clsx(
                Styles.tableRow,
                index < 2 &&
                  css({
                    borderBottom: "1px solid #f3f4f6",
                  })
              )}
            >
              <div>
                <div className={css({ fontWeight: "500", color: "#111827" })}>
                  {apiKey.name}
                </div>
                <div
                  className={css({
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    fontFamily: "monospace",
                  })}
                >
                  {apiKey.keyPrefix}••••••••
                </div>
              </div>
              <div>
                <span
                  className={css({
                    backgroundColor: "#ecfdf5",
                    color: "#065f46",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                  })}
                >
                  {apiKey.environment}
                </span>
              </div>
              <div className={css({ color: "#6b7280" })}>{apiKey.created}</div>
              <div className={css({ color: "#6b7280" })}>{apiKey.lastUsed}</div>
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
                  Copy
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
            className={css({
              fontSize: "0.875rem",
              color: "#374151",
              lineHeight: "1.5",
            })}
          >
            <p className={css({ marginBottom: "0.5rem" })}>
              Include your API key in the Authorization header:
            </p>
            <code
              className={css({
                backgroundColor: "#f3f4f6",
                padding: "0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                display: "block",
                marginBottom: "1rem",
              })}
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
          className={css({
            backgroundColor: "#f0f9ff",
            padding: "1rem",
            borderRadius: "6px",
            border: "1px solid #0ea5e9",
          })}
        >
          <p className={css({ color: "#0c4a6e", fontSize: "0.875rem" })}>
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
  smallButton: css({
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
  }),
  instructionsCard: css({
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    marginBottom: "2rem",
  }),
  sectionTitle: css({
    fontSize: "1.125rem",
    fontWeight: "600",
    marginBottom: "1rem",
    color: "#111827",
  }),
};
