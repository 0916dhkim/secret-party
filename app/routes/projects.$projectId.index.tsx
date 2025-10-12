import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { db } from "../db/db";
import { projectTable, environmentTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { Modal } from "../components/Modal";
import { generateDek, wrapDekWithPassword } from "../crypto/dek";
import { verifyPassword } from "../auth/hash";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";

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

    const project = await db.query.projectTable.findFirst({
      where: eq(projectTable.id, projectId),
      with: {
        environments: {
          columns: {
            id: true,
            name: true,
            projectId: true,
          },
          with: {
            secrets: {
              columns: {
                key: true,
              },
            },
          },
        },
      },
    });

    if (project == null) {
      throw new Error("Project not found", { cause: { status: 404 } });
    }

    return { user: session.user, project };
  });

const environmentCreationSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1, "Environment name is required"),
  password: z.string(),
});

const createEnvironment = createServerFn({
  method: "POST",
})
  .validator(environmentCreationSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const { projectId, name, password } = data;

    // Verify the user's password
    const isPasswordValid = await verifyPassword(
      password,
      session.user.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Verify the project belongs to the user
    const project = await db.query.projectTable.findFirst({
      where: eq(projectTable.id, projectId),
    });

    if (project == null) {
      throw new Error("Project not found or access denied");
    }
    if (project.ownerId !== session.user.id) {
      throw new Error("Project not found or access denied");
    }

    // Generate a new DEK and encrypt it with the user's password
    const dek = generateDek();
    const dekWrappedByPassword = wrapDekWithPassword(dek, password);

    // Create the environment
    const [environment] = await db
      .insert(environmentTable)
      .values({
        name,
        projectId,
        dekWrappedByPassword,
      })
      .returning();

    return { environment };
  });

function ProjectDetail() {
  const { user, project } = Route.useLoaderData();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createEnvironmentForm = useForm({
    defaultValues: {
      name: "",
      password: "",
    },
    validators: {
      onChange: environmentCreationSchema.omit({ projectId: true }),
    },
    async onSubmit({ value }) {
      createEnvironmentMutation.mutate({
        projectId: project.id,
        name: value.name,
        password: value.password,
      });
    },
  });

  const createEnvironmentMutation = useMutation({
    mutationFn: (data: { projectId: number; name: string; password: string }) =>
      createEnvironment({ data }),
    onSuccess: async (result) => {
      // Reload the page to show the new environment
      router.invalidate();
      setIsModalOpen(false);
      createEnvironmentForm.reset();
    },
    onError: (error) => {
      console.error("Failed to create environment:", error);
      alert("Failed to create environment. Please try again.");
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    createEnvironmentMutation.reset();
    createEnvironmentForm.reset();
  };

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
          <h1
            className={css({
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "0.5rem",
            })}
          >
            {project.name}
          </h1>
          <div className={css({ display: "flex", gap: "1rem" })}>
            <button className={Styles.secondaryButton}>Edit Project</button>
            <button
              className={Styles.primaryButton}
              onClick={() => {
                setIsModalOpen(true);
              }}
            >
              + New Environment
            </button>
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
              className={css(({ v }) => ({
                fontSize: "2rem",
                fontWeight: "bold",
                color: v("--c-primary"),
              }))}
            >
              {project.environments.length}
            </div>
            <div
              className={css(({ v }) => ({
                fontSize: "0.875rem",
                color: v("--c-text-muted"),
                marginTop: "0.5rem",
              }))}
            >
              Environments
            </div>
          </div>
          <div className={Styles.statCard}>
            <div
              className={css(({ v }) => ({
                fontSize: "2rem",
                fontWeight: "bold",
                color: v("--c-success"),
              }))}
            >
              {project.environments.reduce(
                (sum, env) => sum + env.secrets.length,
                0
              )}
            </div>
            <div
              className={css(({ v }) => ({
                fontSize: "0.875rem",
                color: v("--c-text-muted"),
                marginTop: "0.5rem",
              }))}
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
                  className={css(({ v }) => ({
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: v("--c-text"),
                  }))}
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
                      ? css(({ v }) => ({
                          backgroundColor: `oklch(from ${v(
                            "--c-danger"
                          )} 0.95 0.05 h)`,
                          color: v("--c-danger"),
                        }))
                      : css(({ v }) => ({
                          backgroundColor: `oklch(from ${v(
                            "--c-success"
                          )} 0.95 0.05 h)`,
                          color: v("--c-success"),
                        }))
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
                  className={css(({ v }) => ({
                    fontSize: "0.875rem",
                    color: v("--c-text-muted"),
                  }))}
                >
                  <strong>{environment.secrets.length}</strong> secrets
                </div>
                <div
                  className={css(({ v }) => ({
                    fontSize: "0.875rem",
                    color: v("--c-text-muted"),
                  }))}
                >
                  Environment ID: {environment.id}
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
                  Manage
                </button>
                <button
                  className={clsx(
                    Styles.environmentActionButton,
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
                  onClick={() => {
                    router.navigate({
                      to: "/projects/$projectId/environments/$environmentId",
                      params: {
                        projectId: project.id.toString(),
                        environmentId: environment.id.toString(),
                      },
                    });
                  }}
                >
                  View Secrets
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
            This is a placeholder project detail page. The actual implementation
            will show real project data, allow project management, and provide
            navigation to environment-specific secret management.
          </p>
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
                marginBottom: "1.5rem",
                margin: 0,
              })}
            >
              Create New Environment
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                createEnvironmentForm.handleSubmit();
              }}
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              })}
            >
              <createEnvironmentForm.Field name="name">
                {(field) => (
                  <div
                    className={css({
                      display: "flex",
                      flexDirection: "column",
                    })}
                  >
                    <label
                      htmlFor="environmentName"
                      className={css(({ v }) => ({
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        marginBottom: "0.5rem",
                        color: v("--c-text"),
                      }))}
                    >
                      Environment Name
                    </label>
                    <input
                      id="environmentName"
                      name="name"
                      type="text"
                      placeholder="Enter environment name"
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
              </createEnvironmentForm.Field>

              <createEnvironmentForm.Field name="password">
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
              </createEnvironmentForm.Field>

              <div
                className={css({
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                })}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={createEnvironmentMutation.isPending}
                  className={css(({ v }) => ({
                    padding: "0.75rem 1.5rem",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    backgroundColor: v("--c-bg-light"),
                    border: `1px solid ${v("--c-border")}`,
                    "&:hover": {
                      backgroundColor: `oklch(from ${v(
                        "--c-bg-light"
                      )} calc(l - 0.05) c h)`,
                    },
                    "&:disabled": {
                      opacity: 0.5,
                      cursor: "not-allowed",
                    },
                  }))}
                >
                  Cancel
                </button>
                <createEnvironmentForm.Subscribe
                  selector={(state) => [state.canSubmit]}
                >
                  {([canSubmit]) => (
                    <button
                      type="submit"
                      disabled={
                        !canSubmit || createEnvironmentMutation.isPending
                      }
                      className={clsx(
                        Styles.button,
                        canSubmit && !createEnvironmentMutation.isPending
                          ? Styles.buttonEnabled
                          : Styles.buttonDisabled
                      )}
                    >
                      {createEnvironmentMutation.isPending
                        ? "Creating..."
                        : "Create Environment"}
                    </button>
                  )}
                </createEnvironmentForm.Subscribe>
              </div>
            </form>
          </div>
        </Modal>

        {/* Child routes (like environment details) will render here */}
        <Outlet />
      </div>
    </Layout>
  );
}

const Styles = {
  statCard: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    padding: "1.5rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    textAlign: "center",
  })),
  secondaryButton: css(({ v }) => ({
    backgroundColor: v("--c-bg-light"),
    color: v("--c-text"),
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    transition: "all 0.2s",
    "&:hover": {
      backgroundColor: `oklch(from ${v("--c-bg-light")} calc(l - 0.05) c h)`,
    },
  })),
  primaryButton: css(({ v }) => ({
    backgroundColor: v("--c-success"),
    color: v("--c-text-alt"),
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    transition: "all 0.2s",
    "&:hover": {
      backgroundColor: `oklch(from ${v("--c-success")} calc(l - 0.05) c h)`,
    },
  })),
  environmentCard: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    padding: "1.5rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    boxShadow: v("--shadow"),
    cursor: "pointer",
    transition: "all 0.2s",
  })),
  environmentActionButton: css({
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "500",
    transition: "all 0.2s",
  }),

  inputValid: css(({ v }) => ({
    border: `1px solid ${v("--c-border")}`,
  })),

  inputInvalid: css(({ v }) => ({
    border: `1px solid ${v("--c-danger")}`,
  })),

  button: css(({ v }) => ({
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: v("--c-text-alt"),
    border: "none",
  })),

  buttonEnabled: css(({ v }) => ({
    backgroundColor: v("--c-success"),
    cursor: "pointer",
    "&:hover": {
      backgroundColor: `oklch(from ${v("--c-success")} calc(l - 0.05) c h)`,
    },
  })),

  buttonDisabled: css(({ v }) => ({
    backgroundColor: `oklch(from ${v("--c-text-muted")} l 0 h)`,
    cursor: "not-allowed",
  })),
};
