import { css } from "@flow-css/core/css";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useForm } from "@tanstack/react-form";
import { clsx } from "clsx";
import { useRef, useState } from "react";
import { z } from "zod";
import { requireAuth } from "../auth/session";
import { Breadcrumb } from "../components/Breadcrumb";
import { Layout } from "../components/Layout";
import { db } from "@secret-party/database/db";
import { projectTable } from "@secret-party/database/schema";
import { mainContent } from "../styles/shared";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { logAuditEvent } from "@secret-party/audit/logger";
import { useRegisterPageApi } from "../testing/useRegisterPageApi";

export const Route = createFileRoute("/projects/")({
  component: Projects,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();

  const projects = await db.query.projectTable.findMany({
    where: { ownerId: session.user.id },
    with: {
      environments: {
        columns: {
          id: true,
          name: true,
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

  const projectCardProps = projects.map((project) => ({
    id: project.id,
    name: project.name,
    environmentCount: project.environments.length,
    secretCount: project.environments.reduce((a, b) => a + b.secrets.length, 0),
  }));

  return {
    user: session.user,
    projectCardProps,
  };
});

const projectCreationSchema = z.object({
  name: z.string().min(1, "Project name is required"),
});

const createProject = createServerFn({
  method: "POST",
})
  .validator(projectCreationSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth();

    const [newProject] = await db
      .insert(projectTable)
      .values({
        name: data.name,
        ownerId: session.user.id,
      })
      .returning();

    if (newProject) {
      await logAuditEvent({
        action: "project_create",
        userId: session.user.id,
        details: { projectId: newProject.id, projectName: data.name },
      });
    }

    return { project: newProject };
  });

interface ProjectCardProps {
  id: string;
  name: string;
  environmentCount: number;
  secretCount: number;
  ref?: (el: HTMLDivElement) => void;
}

function ProjectCard(props: ProjectCardProps) {
  const router = useRouter();

  const handleViewClick = () => {
    router.navigate({
      to: "/projects/$projectId",
      params: { projectId: props.id },
    });
  };

  return (
    <div className={Styles.projectCard} ref={props.ref}>
      <h3
        className={css(({ v }) => ({
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "1rem",
          color: v("--c-text"),
        }))}
      >
        {props.name}
      </h3>
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
          <strong>{props.environmentCount}</strong> environments
        </div>
        <div
          className={css(({ v }) => ({
            fontSize: "0.875rem",
            color: v("--c-text-muted"),
          }))}
        >
          <strong>{props.secretCount}</strong> secrets total
        </div>
      </div>
      <div
        className={css({
          display: "flex",
          justifyContent: "flex-end",
        })}
      >
        <Button onClick={handleViewClick} size="sm">
          Open
        </Button>
      </div>
    </div>
  );
}

function Projects() {
  const loaderData = Route.useLoaderData();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refs for tracking DOM elements needed by the test registry
  const projectCardRefs = useRef<Record<string, HTMLDivElement>>({});
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const createProjectButtonRef = useRef<HTMLButtonElement>(null);
  const submitProjectButtonRef = useRef<HTMLButtonElement>(null);

  const createProjectForm = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onChange: projectCreationSchema,
    },
    async onSubmit({ value }) {
      createProjectMutation.mutate(value.name);
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => createProject({ data: { name } }),
    onSuccess: async (result) => {
      // Navigate to the newly created project
      if (result.project) {
        await router.navigate({
          to: "/projects/$projectId",
          params: { projectId: result.project.id },
        });
      }

      setIsModalOpen(false);
      createProjectForm.reset();
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    createProjectMutation.reset();
    createProjectForm.reset();
  };

  // Register the page API with the testing registry
  useRegisterPageApi("projectListPage", {
    isReady: () => {
      // TanStack Start resolves loaders before rendering, so loader data is always present
      return true;
    },

    getVisibleProjectIds: () => {
      return loaderData.projectCardProps.map((p) => p.id);
    },

    pressProjectItem: ({ id }: { id: string }) => {
      const button = projectCardRefs.current[id]?.querySelector("button");
      if (button instanceof HTMLButtonElement) {
        button.click();
      } else {
        throw new Error(`Project card button not found for ID: ${id}`);
      }
    },

    pressCreateProjectButton: () => {
      createProjectButtonRef.current?.click();
    },

    isCreateProjectModalOpen: () => {
      return isModalOpen;
    },

    inputProjectName: (name: string) => {
      // Use the form's setFieldValue to ensure React sees the change
      createProjectForm.setFieldValue("name", name);
    },

    pressCreateProjectSubmit: () => {
      // Use the submit button ref directly (variant is a React prop, not a DOM attribute)
      if (submitProjectButtonRef.current) {
        submitProjectButtonRef.current.click();
      } else {
        throw new Error("Create project submit button not found");
      }
    },

    pressCreateProjectCancel: () => {
      closeModal();
    },

    isCreatingProject: () => {
      return createProjectMutation.isPending;
    },
  });

  return (
    <Layout userEmail={loaderData.user.email} isAdmin={!!loaderData.user.isAdmin}>
      <Breadcrumb
        items={[
          { label: "Projects" },
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
            Projects
          </h1>
          <Button
            ref={createProjectButtonRef}
            variant="primary"
            onClick={() => setIsModalOpen(true)}
          >
            + New Project
          </Button>
        </div>

        {/* Projects Grid */}
        <div
          className={css({
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            marginBottom: "2rem",
          })}
        >
          {loaderData.projectCardProps.length > 0 ? (
            loaderData.projectCardProps.map((project) => (
              <ProjectCard
                key={project.id}
                {...project}
                ref={(el) => {
                  if (el) {
                    projectCardRefs.current[project.id] = el;
                  } else {
                    delete projectCardRefs.current[project.id];
                  }
                }}
              />
            ))
          ) : (
            <div
              className={css(({ v }) => ({
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "2rem",
                color: v("--c-text-muted"),
                fontSize: "1rem",
              }))}
            >
              No projects yet. Create your first project to get started!
            </div>
          )}
        </div>

        {/* Create Project Modal */}
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
              Create New Project
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                createProjectForm.handleSubmit();
              }}
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              })}
            >
              <createProjectForm.Field name="name">
                {(field) => (
                  <div
                    className={css({
                      display: "flex",
                      flexDirection: "column",
                    })}
                  >
                    <input
                      ref={projectNameInputRef}
                      id="projectName"
                      name="name"
                      type="text"
                      placeholder="Enter project name"
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
              </createProjectForm.Field>

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
                  disabled={createProjectMutation.isPending}
                >
                  Cancel
                </Button>
                <createProjectForm.Subscribe
                  selector={(state) => [state.canSubmit]}
                >
                  {([canSubmit]) => (
                    <Button
                      ref={submitProjectButtonRef}
                      type="submit"
                      variant="success"
                      disabled={!canSubmit || createProjectMutation.isPending}
                    >
                      {createProjectMutation.isPending
                        ? "Creating..."
                        : "Create Project"}
                    </Button>
                  )}
                </createProjectForm.Subscribe>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}

const Styles = {
  projectCard: css(({ v }) => ({
    backgroundColor: v("--c-bg"),
    padding: "1.5rem",
    borderRadius: "8px",
    border: `1px solid ${v("--c-border")}`,
    boxShadow: v("--shadow"),
  })),

  inputValid: css(({ v }) => ({
    border: `1px solid ${v("--c-border")}`,
  })),

  inputInvalid: css(({ v }) => ({
    border: `1px solid ${v("--c-danger")}`,
  })),
};
