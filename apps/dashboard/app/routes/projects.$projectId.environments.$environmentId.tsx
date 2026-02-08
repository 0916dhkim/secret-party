import { createFileRoute, useRouter } from "@tanstack/react-router";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { db } from "@secret-party/database/db";
import { environmentTable, secretTable } from "@secret-party/database/schema";
import { and, eq } from "drizzle-orm";
import { useState } from "react";
import { Modal } from "../components/Modal";
import { unwrapDekWithPassword } from "../crypto/dek";
import { unwrapSecret, wrapSecret } from "../crypto/secrets";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { logAuditEvent } from "@secret-party/audit/logger";

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

const secretCreationSchema = z.object({
  environmentId: z.number(),
  secretKey: z.string(),
  secretValue: z.string(),
  password: z.string(),
});

const createSecret = createServerFn({
  method: "POST",
})
  .validator(secretCreationSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();

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

    await logAuditEvent({
      action: "secret_create",
      userId: session.user.id,
      details: { environmentId: data.environmentId, secretKey: data.secretKey },
    });

    return inserted;
  });

const secretDeletionSchema = z.object({
  environmentId: z.number(),
  secretKey: z.string(),
});

const deleteSecret = createServerFn({
  method: "POST",
})
  .validator(secretDeletionSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();

    const deleted = await db
      .delete(secretTable)
      .where(
        and(
          eq(secretTable.environmentId, data.environmentId),
          eq(secretTable.key, data.secretKey)
        )
      )
      .returning();

    if (deleted.length > 0) {
      await logAuditEvent({
        action: "secret_delete",
        userId: session.user.id,
        details: { environmentId: data.environmentId, secretKey: data.secretKey },
      });
    }
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
    const session = await requireAuth();

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

    await logAuditEvent({
      action: "secret_view",
      userId: session.user.id,
      details: { environmentId: data.environmentId, secretKey: data.key },
    });

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

  const createSecretForm = useForm({
    defaultValues: {
      secretKey: "",
      secretValue: "",
      password: "",
    },
    validators: {
      onChange: secretCreationSchema.omit({ environmentId: true }),
    },
    async onSubmit({ value }) {
      createSecretMutation.mutate({
        ...value,
        environmentId: environment.id,
      });
    },
  });

  const createSecretMutation = useMutation({
    mutationFn: (data: z.infer<typeof secretCreationSchema>) =>
      createSecret({ data }),
    onSuccess: async (result) => {
      // Reload the page to show the new secret
      router.invalidate();
      setIsCraeteModalOpen(false);
      createSecretForm.reset();
    },
    onError: (error) => {
      console.error("Failed to create secret:", error);
      alert("Failed to create secret. Please try again.");
    },
  });

  const deleteSecretMutation = useMutation({
    mutationFn: (data: z.infer<typeof secretDeletionSchema>) =>
      deleteSecret({ data }),
    onSuccess: async (result) => {
      // Reload the page
      router.invalidate();
    },
  });

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

  const closeModal = () => {
    setIsCraeteModalOpen(false);
    createSecretMutation.reset();
    createSecretForm.reset();
  };

  return (
    <Layout userEmail={user.email}>
      <Breadcrumb
        items={[
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
            <Button
              variant="primary"
              onClick={() => setIsCraeteModalOpen(true)}
            >
              + Add Secret
            </Button>
          </div>
        </div>

        {/* Secrets Table */}
        <div className={Styles.tableContainer}>
          <div className={Styles.tableHeader}>
            <div>Secret Key</div>
            <div>Encrypted Value</div>
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedSecretKey(secret.key)}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    deleteSecretMutation.mutate({
                      environmentId: environment.id,
                      secretKey: secret.key,
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCraeteModalOpen(false)}
      >
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            padding: "2rem",
            gap: "1rem",
          })}
        >
          <h2
            className={css({
              fontSize: "1.5rem",
              fontWeight: "600",
              margin: 0,
            })}
          >
            Add Secret
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              createSecretForm.handleSubmit();
            }}
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            })}
          >
            <createSecretForm.Field name="secretKey">
              {(field) => (
                <div
                  className={css({
                    display: "flex",
                    flexDirection: "column",
                  })}
                >
                  <label
                    htmlFor="secretKey"
                    className={css(({ v }) => ({
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                      color: v("--c-text"),
                    }))}
                  >
                    Secret Key
                  </label>
                  <input
                    id="secretKey"
                    name={field.name}
                    type="text"
                    placeholder="Enter secret key"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={clsx(
                      Styles.input,
                      field.state.meta.isValid
                        ? Styles.inputValid
                        : Styles.inputInvalid
                    )}
                    autoFocus
                  />
                  {!field.state.meta.isValid && (
                    <div
                      className={css(({ v }) => ({
                        color: v("--c-danger"),
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }))}
                    >
                      {field.state.meta.errors
                        .map((x) => x?.message)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
            </createSecretForm.Field>
            <createSecretForm.Field name="secretValue">
              {(field) => (
                <div
                  className={css({
                    display: "flex",
                    flexDirection: "column",
                  })}
                >
                  <label
                    htmlFor="secretValue"
                    className={css(({ v }) => ({
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                      color: v("--c-text"),
                    }))}
                  >
                    Secret Value
                  </label>
                  <input
                    id="secretValue"
                    name={field.name}
                    type="text"
                    placeholder="Enter secret value"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={clsx(
                      Styles.input,
                      field.state.meta.isValid
                        ? Styles.inputValid
                        : Styles.inputInvalid
                    )}
                  />
                  {!field.state.meta.isValid && (
                    <div
                      className={css(({ v }) => ({
                        color: v("--c-danger"),
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }))}
                    >
                      {field.state.meta.errors
                        .map((x) => x?.message)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
            </createSecretForm.Field>
            <createSecretForm.Field name="password">
              {(field) => (
                <div
                  className={css({
                    display: "flex",
                    flexDirection: "column",
                  })}
                >
                  <label
                    htmlFor="createSecretPassword"
                    className={css(({ v }) => ({
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                      color: v("--c-text"),
                    }))}
                  >
                    Your Password
                  </label>
                  <input
                    id="createSecretPassword"
                    name={field.name}
                    type="password"
                    placeholder="Enter your password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={clsx(
                      Styles.input,
                      field.state.meta.isValid
                        ? Styles.inputValid
                        : Styles.inputInvalid
                    )}
                  />
                  {!field.state.meta.isValid && (
                    <div
                      className={css(({ v }) => ({
                        color: v("--c-danger"),
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }))}
                    >
                      {field.state.meta.errors
                        .map((x) => x?.message)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
            </createSecretForm.Field>

            <div
              className={css({
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              })}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                disabled={createSecretMutation.isPending}
              >
                Cancel
              </Button>
              <createSecretForm.Subscribe
                selector={(state) => [state.canSubmit]}
              >
                {([canSubmit]) => (
                  <Button
                    type="submit"
                    variant="success"
                    disabled={!canSubmit || createSecretMutation.isPending}
                  >
                    {createSecretMutation.isPending
                      ? "Adding..."
                      : "Add Secret"}
                  </Button>
                )}
              </createSecretForm.Subscribe>
            </div>
          </form>
        </div>
      </Modal>
      <Modal
        open={selectedSecretKey != null}
        onClose={() => {
          setSelectedSecretKey(null);
          setDecryptedValue(null);
        }}
      >
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            padding: "2rem",
            gap: "1rem",
          })}
        >
          <h2
            className={css({
              fontSize: "1.5rem",
              fontWeight: "600",
              margin: 0,
            })}
          >
            View Secret
          </h2>

          {decryptedValue ? (
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              })}
            >
              <label
                className={css(({ v }) => ({
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: v("--c-text"),
                }))}
              >
                Decrypted Value
              </label>
              <code
                className={css(({ v }) => ({
                  padding: "0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontFamily: "monospace",
                  backgroundColor: v("--c-bg-light"),
                  color: v("--c-text"),
                  border: `1px solid ${v("--c-border")}`,
                  wordBreak: "break-all",
                }))}
              >
                {decryptedValue}
              </code>
              <div
                className={css({
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "0.5rem",
                })}
              >
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedSecretKey(null);
                    setDecryptedValue(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleViewSubmit}
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              })}
            >
              <div
                className={css({
                  display: "flex",
                  flexDirection: "column",
                })}
              >
                <label
                  htmlFor="viewSecretPassword"
                  className={css(({ v }) => ({
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    color: v("--c-text"),
                  }))}
                >
                  Your Password
                </label>
                <input
                  id="viewSecretPassword"
                  className={clsx(Styles.input, Styles.inputValid, "password2")}
                  type="password"
                  placeholder="Enter your password"
                  autoFocus
                />
              </div>
              <div
                className={css({
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                })}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSelectedSecretKey(null);
                    setDecryptedValue(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Decrypt
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </Layout>
  );
}

const Styles = {
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

  input: css({
    padding: "0.75rem",
    borderRadius: "6px",
    fontSize: "0.875rem",
    backgroundColor: "var(--c-bg-light)",
    color: "var(--c-text)",
    "&:focus": {
      outline: "none",
      borderColor: "var(--c-primary)",
      boxShadow: "0 0 0 2px oklch(from var(--c-primary) l c h / 0.2)",
    },
  }),

  inputValid: css(({ v }) => ({
    border: `1px solid ${v("--c-border")}`,
  })),

  inputInvalid: css(({ v }) => ({
    border: `1px solid ${v("--c-danger")}`,
  })),
};
