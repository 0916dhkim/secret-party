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
import { useState } from "react";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import { generateKeyPair, serializeKeyPair } from "../crypto/keypair";
import { verifyPassword } from "../auth/hash";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/api-keys/")({
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
          environment: {
            with: {
              project: true,
            },
          },
        },
      },
    },
  });

  return { user: session.user, apiClients };
});

const apiKeyCreationSchema = z.object({
  name: z.string().min(1, "API key name is required"),
  password: z.string().min(1, "Password is required"),
});

const createApiKey = createServerFn({
  method: "POST",
})
  .validator(apiKeyCreationSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const { name, password } = data;

    const isPasswordValid = await verifyPassword(
      password,
      session.user.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const keyPair = await generateKeyPair();
    const { publicKey: publicKeyPEM, privateKey: privateKeyPEM } =
      await serializeKeyPair(keyPair);

    const [apiClient] = await db
      .insert(apiClientTable)
      .values({
        name,
        publicKey: publicKeyPEM,
        userId: session.user.id,
      })
      .returning();

    if (apiClient == null) {
      throw new Error("Failed to create API client");
    }

    return {
      apiClient,
      privateKey: privateKeyPEM,
    };
  });

function ApiKeys() {
  const loaderData = Route.useLoaderData();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrivateKeyModalOpen, setIsPrivateKeyModalOpen] = useState(false);
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState<string | null>(
    null
  );

  const createApiKeyForm = useForm({
    defaultValues: {
      name: "",
      password: "",
    },
    validators: {
      onChange: apiKeyCreationSchema,
    },
    async onSubmit({ value }) {
      createApiKeyMutation.mutate({
        name: value.name,
        password: value.password,
      });
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (data: { name: string; password: string }) =>
      createApiKey({ data }),
    onSuccess: async (result) => {
      setGeneratedPrivateKey(result.privateKey);
      setIsModalOpen(false);
      setIsPrivateKeyModalOpen(true);
      createApiKeyForm.reset();
      router.invalidate();
    },
    onError: (error) => {
      console.error("Failed to create API key:", error);
      alert("Failed to create API key. Please try again.");
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    createApiKeyMutation.reset();
    createApiKeyForm.reset();
  };

  const closePrivateKeyModal = () => {
    setIsPrivateKeyModalOpen(false);
    setGeneratedPrivateKey(null);
  };

  const copyPrivateKey = async () => {
    if (generatedPrivateKey) {
      await navigator.clipboard.writeText(generatedPrivateKey);
      alert("Private key copied to clipboard!");
    }
  };

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb
        items={[
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
          <Button
            variant="success"
            onClick={() => {
              setIsModalOpen(true);
            }}
          >
            + Generate API Key
          </Button>
        </div>

        {/* API Keys Table */}
        <div className={Styles.tableContainer}>
          <div className={Styles.tableHeader}>
            <div>Name</div>
            <div>Actions</div>
          </div>

          {/* Sample API Keys - these would be generated from data */}
          {loaderData.apiClients.map((apiClient, index) => (
            <div
              key={index}
              className={clsx(
                Styles.tableRow,
                index < loaderData.apiClients.length - 1 &&
                  css(({ v }) => ({
                    borderBottom: `1px solid ${v("--c-border")}`,
                  }))
              )}
            >
              <div
                className={css(({ v }) => ({
                  fontWeight: "500",
                  color: v("--c-text"),
                }))}
              >
                {apiClient.name}
              </div>
              <div className={css({ display: "flex", gap: "0.5rem" })}>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.navigate({
                      to: "/api-keys/$apiClientId",
                      params: { apiClientId: apiClient.id.toString() },
                    });
                  }}
                >
                  Manage
                </Button>
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

        <Modal open={isModalOpen} onClose={closeModal}>
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
                marginBottom: "1rem",
                margin: 0,
              })}
            >
              Generate New API Key
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                createApiKeyForm.handleSubmit();
              }}
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              })}
            >
              <createApiKeyForm.Field name="name">
                {(field) => (
                  <div
                    className={css({
                      display: "flex",
                      flexDirection: "column",
                    })}
                  >
                    <label
                      htmlFor="apiKeyName"
                      className={css(({ v }) => ({
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        marginBottom: "0.5rem",
                        color: v("--c-text"),
                      }))}
                    >
                      API Key Name
                    </label>
                    <input
                      id="apiKeyName"
                      name="name"
                      type="text"
                      placeholder="Enter API key name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={clsx(
                        css({
                          padding: "0.75rem",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          backgroundColor: "var(--c-bg-light)",
                          color: "var(--c-text)",
                          border: "1px solid var(--c-border)",
                          "&:focus": {
                            outline: "none",
                            borderColor: "var(--c-primary)",
                            boxShadow:
                              "0 0 0 2px oklch(from var(--c-primary) l c h / 0.2)",
                          },
                        }),
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
              </createApiKeyForm.Field>

              <createApiKeyForm.Field name="password">
                {(field) => (
                  <div
                    className={css({
                      display: "flex",
                      flexDirection: "column",
                    })}
                  >
                    <label
                      htmlFor="password"
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
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={clsx(
                        css({
                          padding: "0.75rem",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          backgroundColor: "var(--c-bg-light)",
                          color: "var(--c-text)",
                          border: "1px solid var(--c-border)",
                          "&:focus": {
                            outline: "none",
                            borderColor: "var(--c-primary)",
                            boxShadow:
                              "0 0 0 2px oklch(from var(--c-primary) l c h / 0.2)",
                          },
                        }),
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
              </createApiKeyForm.Field>

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
                  disabled={createApiKeyMutation.isPending}
                >
                  Cancel
                </Button>
                <createApiKeyForm.Subscribe
                  selector={(state) => [state.canSubmit]}
                >
                  {([canSubmit]) => (
                    <Button
                      type="submit"
                      variant="success"
                      disabled={!canSubmit || createApiKeyMutation.isPending}
                    >
                      {createApiKeyMutation.isPending
                        ? "Generating..."
                        : "Generate API Key"}
                    </Button>
                  )}
                </createApiKeyForm.Subscribe>
              </div>
            </form>
          </div>
        </Modal>

        <Modal open={isPrivateKeyModalOpen} onClose={closePrivateKeyModal}>
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              padding: "2rem",
              gap: "1rem",
              maxWidth: "600px",
            })}
          >
            <h2
              className={css({
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1rem",
                margin: 0,
              })}
            >
              API Key Generated Successfully
            </h2>
            <div
              className={css(({ v }) => ({
                backgroundColor: `oklch(from ${v("--c-info")} 0.85 0.1 h)`,
                padding: "1rem",
                borderRadius: "6px",
                border: `1px solid ${v("--c-info")}`,
                marginBottom: "1rem",
              }))}
            >
              <p
                className={css(({ v }) => ({
                  color: `oklch(from ${v("--c-info")} 0.3 c h)`,
                  fontSize: "0.875rem",
                  margin: 0,
                }))}
              >
                <strong>Important:</strong> Save your private key now. You won't
                be able to see it again after closing this dialog.
              </p>
            </div>
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
                Private Key
              </label>
              <textarea
                readOnly
                value={generatedPrivateKey || ""}
                className={css(({ v }) => ({
                  padding: "0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  backgroundColor: v("--c-bg-light"),
                  color: v("--c-text"),
                  border: `1px solid ${v("--c-border")}`,
                  minHeight: "200px",
                  resize: "vertical",
                }))}
              />
            </div>
            <div
              className={css({
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              })}
            >
              <Button variant="secondary" onClick={copyPrivateKey}>
                Copy Private Key
              </Button>
              <Button variant="primary" onClick={closePrivateKeyModal}>
                I've Saved It
              </Button>
            </div>
          </div>
        </Modal>
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
    gridTemplateColumns: "2fr 1fr",
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
    gridTemplateColumns: "2fr 1fr",
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
  inputValid: css(({ v }) => ({
    border: `1px solid ${v("--c-border")}`,
  })),
  inputInvalid: css(({ v }) => ({
    border: `1px solid ${v("--c-danger")}`,
  })),
};
