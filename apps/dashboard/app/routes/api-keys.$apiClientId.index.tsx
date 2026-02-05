import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import {
  db,
  apiClientTable,
  environmentTable,
  projectTable,
  environmentAccessTable,
} from "@secret-party/database";
import { eq, and } from "drizzle-orm";
import { useState } from "react";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import { unwrapDekWithPassword, wrapDekWithPublicKey } from "../crypto/dek";
import { deserializePublicKey } from "../crypto/keypair";
import { verifyPassword } from "../auth/hash";
import { logAuditEvent } from "../audit/logger";

export const Route = createFileRoute("/api-keys/$apiClientId/")({
  component: ApiKeyDetail,
  loader: async ({ params }) =>
    await loader({ data: { apiClientId: Number(params.apiClientId) } }),
});

const loader = createServerFn({ method: "GET" })
  .validator(
    z.object({
      apiClientId: z.number(),
    })
  )
  .handler(async ({ data: { apiClientId } }) => {
    const session = await requireAuth();

    // Load the API client with its access records
    const apiClient = await db.query.apiClientTable.findFirst({
      where: eq(apiClientTable.id, apiClientId),
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

    if (apiClient == null) {
      throw new Error("API key not found", { cause: { status: 404 } });
    }

    // Verify ownership
    if (apiClient.userId !== session.user.id) {
      throw new Error("Access denied", { cause: { status: 403 } });
    }

    // Load all environments from projects owned by the user
    const projects = await db.query.projectTable.findMany({
      where: eq(projectTable.ownerId, session.user.id),
      with: {
        environments: {
          columns: {
            id: true,
            name: true,
            projectId: true,
          },
        },
      },
    });

    // Get set of environment IDs that have access
    const grantedEnvironmentIds = new Set(
      apiClient.access.map((access) => access.environmentId)
    );

    return {
      user: session.user,
      apiClient,
      projects,
      grantedEnvironmentIds: Array.from(grantedEnvironmentIds),
    };
  });

const grantAccessSchema = z.object({
  apiClientId: z.number(),
  environmentId: z.number(),
  password: z.string().min(1, "Password is required"),
});

const grantAccess = createServerFn({
  method: "POST",
})
  .validator(grantAccessSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const { apiClientId, environmentId, password } = data;

    // Verify password
    const isPasswordValid = await verifyPassword(
      password,
      session.user.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Verify API client ownership
    const apiClient = await db.query.apiClientTable.findFirst({
      where: eq(apiClientTable.id, apiClientId),
    });

    if (apiClient == null || apiClient.userId !== session.user.id) {
      throw new Error("API key not found or access denied");
    }

    // Verify environment ownership
    const environment = await db.query.environmentTable.findFirst({
      where: eq(environmentTable.id, environmentId),
      with: {
        project: true,
      },
    });

    if (
      environment == null ||
      environment.project.ownerId !== session.user.id
    ) {
      throw new Error("Environment not found or access denied");
    }

    // Check if access already exists
    const existingAccess = await db.query.environmentAccessTable.findFirst({
      where: and(
        eq(environmentAccessTable.clientId, apiClientId),
        eq(environmentAccessTable.environmentId, environmentId)
      ),
    });

    if (existingAccess != null) {
      throw new Error("Access already granted");
    }

    // Unwrap DEK with password
    const dek = unwrapDekWithPassword(
      environment.dekWrappedByPassword,
      password
    );

    // Deserialize public key and wrap DEK with it
    const publicKey = await deserializePublicKey(apiClient.publicKey);
    const dekWrappedByClientPublicKey = await wrapDekWithPublicKey(
      dek,
      publicKey
    );

    // Create access record
    await db.insert(environmentAccessTable).values({
      environmentId,
      clientId: apiClientId,
      dekWrappedByClientPublicKey,
    });

    await logAuditEvent({
      action: "environment_access_grant",
      userId: session.user.id,
      details: { apiClientId, environmentId },
    });

    return { success: true };
  });

const revokeAccessSchema = z.object({
  apiClientId: z.number(),
  environmentId: z.number(),
});

const revokeAccess = createServerFn({
  method: "POST",
})
  .validator(revokeAccessSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const { apiClientId, environmentId } = data;

    // Verify API client ownership
    const apiClient = await db.query.apiClientTable.findFirst({
      where: eq(apiClientTable.id, apiClientId),
    });

    if (apiClient == null || apiClient.userId !== session.user.id) {
      throw new Error("API key not found or access denied");
    }

    // Delete access record
    await db
      .delete(environmentAccessTable)
      .where(
        and(
          eq(environmentAccessTable.clientId, apiClientId),
          eq(environmentAccessTable.environmentId, environmentId)
        )
      );

    await logAuditEvent({
      action: "environment_access_revoke",
      userId: session.user.id,
      details: { apiClientId, environmentId },
    });

    return { success: true };
  });

const deleteApiKeySchema = z.object({
  apiClientId: z.number(),
});

const deleteApiKey = createServerFn({
  method: "POST",
})
  .validator(deleteApiKeySchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const { apiClientId } = data;

    // Verify API client ownership
    const apiClient = await db.query.apiClientTable.findFirst({
      where: eq(apiClientTable.id, apiClientId),
    });

    if (apiClient == null || apiClient.userId !== session.user.id) {
      throw new Error("API key not found or access denied");
    }

    // Delete API client (cascade will handle access records)
    await db.delete(apiClientTable).where(eq(apiClientTable.id, apiClientId));

    await logAuditEvent({
      action: "api_client_delete",
      userId: session.user.id,
      details: { apiClientId, apiClientName: apiClient.name },
    });

    return { success: true };
  });

function ApiKeyDetail() {
  const loaderData = Route.useLoaderData();
  const router = useRouter();
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<
    number | null
  >(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
    new Set()
  );

  const grantAccessForm = useForm({
    defaultValues: {
      password: "",
    },
    validators: {
      onChange: z.object({
        password: z.string().min(1, "Password is required"),
      }),
    },
    async onSubmit({ value }) {
      if (selectedEnvironmentId == null) return;
      grantAccessMutation.mutate({
        apiClientId: loaderData.apiClient.id,
        environmentId: selectedEnvironmentId,
        password: value.password,
      });
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: (data: {
      apiClientId: number;
      environmentId: number;
      password: string;
    }) => grantAccess({ data }),
    onSuccess: async () => {
      setIsGrantModalOpen(false);
      grantAccessForm.reset();
      setSelectedEnvironmentId(null);
      router.invalidate();
    },
    onError: (error: any) => {
      console.error("Failed to grant access:", error);
      alert(error?.message || "Failed to grant access. Please try again.");
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: (data: { apiClientId: number; environmentId: number }) =>
      revokeAccess({ data }),
    onSuccess: async () => {
      router.invalidate();
    },
    onError: (error) => {
      console.error("Failed to revoke access:", error);
      alert("Failed to revoke access. Please try again.");
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: (data: { apiClientId: number }) => deleteApiKey({ data }),
    onSuccess: async () => {
      router.navigate({ to: "/api-keys" });
    },
    onError: (error) => {
      console.error("Failed to delete API key:", error);
      alert("Failed to delete API key. Please try again.");
    },
  });

  const handleGrantAccess = (environmentId: number) => {
    setSelectedEnvironmentId(environmentId);
    setIsGrantModalOpen(true);
  };

  const handleRevokeAccess = (environmentId: number) => {
    if (
      confirm(
        "Are you sure you want to revoke access to this environment? This action cannot be undone."
      )
    ) {
      revokeAccessMutation.mutate({
        apiClientId: loaderData.apiClient.id,
        environmentId,
      });
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this API key? This action cannot be undone and will revoke all access."
      )
    ) {
      deleteApiKeyMutation.mutate({
        apiClientId: loaderData.apiClient.id,
      });
    }
  };

  const copyPublicKey = async () => {
    await navigator.clipboard.writeText(loaderData.apiClient.publicKey);
    alert("Public key copied to clipboard!");
  };

  const closeGrantModal = () => {
    setIsGrantModalOpen(false);
    grantAccessForm.reset();
    setSelectedEnvironmentId(null);
  };

  const selectedEnvironment =
    selectedEnvironmentId != null
      ? loaderData.projects
          .flatMap((p) => p.environments)
          .find((env) => env.id === selectedEnvironmentId)
      : null;

  const toggleProject = (projectId: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb
        items={[
          { label: "API Keys", path: "/api-keys" },
          { label: loaderData.apiClient.name },
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
            {loaderData.apiClient.name}
          </h1>
          <Button variant="destructive" onClick={handleDelete}>
            Delete API Key
          </Button>
        </div>

        {/* Public Key Section */}
        <div className={Styles.section}>
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            })}
          >
            <h2 className={Styles.sectionTitle}>Public Key</h2>
            <Button size="sm" variant="secondary" onClick={copyPublicKey}>
              Copy
            </Button>
          </div>
          <div className={Styles.publicKeyContainer}>
            <div className={Styles.publicKeyDisplay}>
              {loaderData.apiClient.publicKey}
            </div>
          </div>
        </div>

        {/* Environment Access Section */}
        <div className={Styles.section}>
          <h2
            className={clsx(
              Styles.sectionTitle,
              css({ marginBottom: "1.5rem" })
            )}
          >
            Environment Access
          </h2>
          {loaderData.projects.length === 0 ||
          loaderData.projects.every((p) => p.environments.length === 0) ? (
            <div
              className={css(({ v }) => ({
                padding: "2rem",
                textAlign: "center",
                color: v("--c-text-muted"),
              }))}
            >
              No environments available. Create a project and environment first.
            </div>
          ) : (
            <div className={Styles.projectsList}>
              {loaderData.projects
                .filter((project) => project.environments.length > 0)
                .map((project) => {
                  const isExpanded = expandedProjects.has(project.id);
                  return (
                    <div key={project.id} className={Styles.projectItem}>
                      <button
                        type="button"
                        onClick={() => toggleProject(project.id)}
                        className={Styles.projectHeader}
                      >
                        <span
                          className={clsx(
                            Styles.arrowIcon,
                            isExpanded && Styles.arrowIconExpanded
                          )}
                        >
                          ▶
                        </span>
                        <span
                          className={css(({ v }) => ({
                            fontWeight: "600",
                            color: v("--c-text"),
                            fontSize: "1rem",
                          }))}
                        >
                          {project.name}
                        </span>
                        <span
                          className={css(({ v }) => ({
                            marginLeft: "auto",
                            color: v("--c-text-muted"),
                            fontSize: "0.875rem",
                          }))}
                        >
                          {project.environments.length}{" "}
                          {project.environments.length === 1
                            ? "environment"
                            : "environments"}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className={Styles.environmentsList}>
                          {project.environments.map((environment) => {
                            const hasAccess =
                              loaderData.grantedEnvironmentIds.includes(
                                environment.id
                              );
                            return (
                              <div
                                key={environment.id}
                                className={Styles.environmentItem}
                              >
                                <div className={Styles.environmentInfo}>
                                  <div
                                    className={css(({ v }) => ({
                                      fontWeight: "500",
                                      color: v("--c-text"),
                                    }))}
                                  >
                                    {environment.name}
                                  </div>
                                </div>
                                <div className={Styles.environmentActions}>
                                  {hasAccess ? (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        handleRevokeAccess(environment.id)
                                      }
                                      disabled={revokeAccessMutation.isPending}
                                    >
                                      Revoke Access
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="success"
                                      onClick={() =>
                                        handleGrantAccess(environment.id)
                                      }
                                    >
                                      Grant Access
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Grant Access Modal */}
        <Modal open={isGrantModalOpen} onClose={closeGrantModal}>
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
              Grant Access to{" "}
              {
                loaderData.projects.find((p) =>
                  p.environments.some((e) => e.id === selectedEnvironmentId)
                )?.name
              }{" "}
              / {selectedEnvironment?.name}
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
                Enter your password to grant access. Your password is required
                to decrypt the environment's encryption key.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                grantAccessForm.handleSubmit();
              }}
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              })}
            >
              <grantAccessForm.Field name="password">
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
              </grantAccessForm.Field>

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
                  onClick={closeGrantModal}
                  disabled={grantAccessMutation.isPending}
                >
                  Cancel
                </Button>
                <grantAccessForm.Subscribe
                  selector={(state) => [state.canSubmit]}
                >
                  {([canSubmit]) => (
                    <Button
                      type="submit"
                      variant="success"
                      disabled={!canSubmit || grantAccessMutation.isPending}
                    >
                      {grantAccessMutation.isPending
                        ? "Granting..."
                        : "Grant Access"}
                    </Button>
                  )}
                </grantAccessForm.Subscribe>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}

const Styles = {
  section: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    boxShadow: v("--shadow"),
    padding: "1.5rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    marginBottom: "2rem",
  })),
  sectionTitle: css(({ v }) => ({
    fontSize: "1.25rem",
    fontWeight: "600",
    color: v("--c-text"),
  })),
  publicKeyContainer: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  }),
  publicKeyDisplay: css(({ v }) => ({
    padding: "0.75rem",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontFamily: "monospace",
    backgroundColor: v("--c-bg-light"),
    color: v("--c-text"),
    border: `1px solid ${v("--c-border")}`,
    minHeight: "120px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  })),
  projectsList: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),
  projectItem: css(({ v }) => ({
    borderRadius: "6px",
    border: `1px solid ${v("--c-border")}`,
    backgroundColor: v("--c-bg-light"),
    overflow: "hidden",
  })),
  projectHeader: css(({ v }) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    padding: "1rem",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    "&:hover": {
      backgroundColor: `oklch(from ${v("--c-bg-light")} calc(l + 0.02) c h)`,
    },
  })),
  environmentsList: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "0.5rem",
    paddingTop: 0,
  }),
  environmentItem: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1rem",
    borderRadius: "4px",
    border: "1px solid var(--c-border)",
    backgroundColor: "var(--c-bg)",
    marginLeft: "1.5rem",
  }),
  environmentInfo: css({
    flex: 1,
  }),
  environmentActions: css({
    display: "flex",
    gap: "0.5rem",
  }),
  inputValid: css(({ v }) => ({
    border: `1px solid ${v("--c-border")}`,
  })),
  inputInvalid: css(({ v }) => ({
    border: `1px solid ${v("--c-danger")}`,
  })),
  arrowIcon: css({
    transition: "transform 0.2s",
    display: "inline-block",
    marginRight: "0.5rem",
    transform: "rotate(0deg)",
  }),
  arrowIconExpanded: css({
    transform: "rotate(90deg)",
  }),
};
