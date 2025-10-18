import { createFileRoute, useRouter } from "@tanstack/react-router";
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
import { environmentTable, secretTable } from "../db/schema";
import { useState } from "react";
import { Modal } from "../components/Modal";
import { unwrapDekWithPassword } from "../crypto/dek";
import { unwrapSecret, wrapSecret } from "../crypto/secrets";

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

    if (environment == null) {
      throw new Error("Environment not found", { cause: { status: 404 } });
    }

    return { user: session.user, environment };
  });

const createSecret = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      environmentId: z.number(),
      secretKey: z.string(),
      secretValue: z.string(),
      password: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const environment = await db.query.environmentTable.findFirst({
      where: eq(environmentTable.id, data.environmentId),
    });

    if (environment == null) {
      throw new Error("Missing environment");
    }

    const { dekWrappedByPassword } = environment;
    const dek = unwrapDekWithPassword(dekWrappedByPassword, data.password);

    const valueEncrypted = wrapSecret(data.secretValue, dek);

    const inserted = await db
      .insert(secretTable)
      .values({
        key: data.secretKey,
        environmentId: data.environmentId,
        valueEncrypted,
      })
      .returning();

    return inserted;
  });

const decryptSecret = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      environmentId: z.number(),
      key: z.string(),
      password: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const environment = await db.query.environmentTable.findFirst({
      where: eq(environmentTable.id, data.environmentId),
    });
    if (environment == null) {
      throw new Error("Missing environment");
    }
    const dek = unwrapDekWithPassword(
      environment.dekWrappedByPassword,
      data.password
    );
    const secret = await db.query.secretTable.findFirst({
      where: and(
        eq(secretTable.environmentId, data.environmentId),
        eq(secretTable.key, data.key)
      ),
    });
    if (secret == null) {
      throw new Error("Missing secret");
    }

    const value = unwrapSecret(secret.valueEncrypted, dek);
    return { value };
  });

function EnvironmentDetail() {
  const router = useRouter();
  const { user, environment } = Route.useLoaderData();
  const [isCreateModalOpen, setIsCraeteModalOpen] = useState(false);
  const [selectedSecretKey, setSelectedSecretKey] = useState<string | null>(
    null
  );
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    const keyInput = document.querySelector<HTMLInputElement>(".secret-key");
    const valueInput =
      document.querySelector<HTMLInputElement>(".secret-value");
    const passwordInput = document.querySelector<HTMLInputElement>(".password");

    if (keyInput == null || valueInput == null || passwordInput == null) {
      throw new Error("Missing input element");
    }
    await createSecret({
      data: {
        environmentId: environment.id,
        secretKey: keyInput.value,
        secretValue: valueInput.value,
        password: passwordInput.value,
      },
    });

    setIsCraeteModalOpen(false);
    router.invalidate();
  };

  const handleViewSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    if (selectedSecretKey == null) {
      throw new Error("No secret selected");
    }
    const passwordInput =
      document.querySelector<HTMLInputElement>(".password2");
    if (passwordInput == null) {
      throw new Error("Missing input element");
    }
    const password = passwordInput.value;
    if (!password) {
      debugger;
    }
    const { value } = await decryptSecret({
      data: {
        environmentId: environment.id,
        key: selectedSecretKey,
        password,
      },
    });
    setDecryptedValue(value);
  };

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
                  backgroundColor: v("--c-primary"),
                  color: v("--c-text-alt"),
                  "&:hover": {
                    backgroundColor: `oklch(from ${v(
                      "--c-primary"
                    )} calc(l - 0.05) c h)`,
                  },
                }))
              )}
              onClick={() => setIsCraeteModalOpen(true)}
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
                  maxWidth: "30rem",
                  overflow: "hidden",
                }))}
              >
                {`${secret.valueEncrypted.substring(0, 6)}*****`}
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
                  onClick={() => setSelectedSecretKey(secret.key)}
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
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCraeteModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <p>Secret key</p>
          <input className="secret-key" />
          <p>Secret value</p>
          <input className="secret-value" />
          <p>User password</p>
          <input className="password" type="password" />
          <button>Cancel</button>
          <button>Add</button>
        </form>
      </Modal>
      <Modal
        open={selectedSecretKey != null}
        onClose={() => {
          setSelectedSecretKey(null);
          setDecryptedValue(null);
        }}
      >
        {decryptedValue ? (
          decryptedValue
        ) : (
          <form onSubmit={handleViewSubmit}>
            <p>User password</p>
            <input className="password2" type="password" />
          </form>
        )}
      </Modal>
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
