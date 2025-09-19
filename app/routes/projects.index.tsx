import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { clsx } from "clsx";
import { useMutation } from "@tanstack/react-query";
import { requireAuth } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { db } from "../db/db";
import { projectTable, environmentTable, secretTable } from "../db/schema";
import { eq, count } from "drizzle-orm";

export const Route = createFileRoute("/projects/")({
  component: Projects,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();

  // Fetch projects for the current user
  const projects = await db
    .select()
    .from(projectTable)
    .where(eq(projectTable.ownerId, session.user.id));

  // For each project, fetch its stats
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      // Get environment count
      const environmentCount = await db
        .select({ count: count() })
        .from(environmentTable)
        .where(eq(environmentTable.projectId, project.id));

      // Get total secret count across all environments in this project
      const secretCount = await db
        .select({ count: count() })
        .from(secretTable)
        .innerJoin(
          environmentTable,
          eq(secretTable.environmentId, environmentTable.id)
        )
        .where(eq(environmentTable.projectId, project.id));

      return {
        ...project,
        environments: environmentCount[0]?.count || 0,
        secrets: secretCount[0]?.count || 0,
      };
    })
  );

  return {
    user: session.user,
    projects: projectsWithStats,
  };
});

const createProject = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await requireAuth();

  // Create a new project for the current user
  await db.insert(projectTable).values({
    ownerId: session.user.id,
  });

  return { success: true };
});

interface Project {
  id: number;
  ownerId: number;
  environments: number;
  secrets: number;
}

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();

  const handleViewClick = () => {
    router.navigate({
      to: "/projects/$projectId",
      params: { projectId: project.id.toString() },
    });
  };

  return (
    <div className={Styles.projectCard}>
      <h3
        className={css(({ v }) => ({
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "1rem",
          color: v("--c-text"),
        }))}
      >
        Project Name
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
          <strong>{project.environments}</strong> environments
        </div>
        <div
          className={css(({ v }) => ({
            fontSize: "0.875rem",
            color: v("--c-text-muted"),
          }))}
        >
          <strong>{project.secrets}</strong> secrets total
        </div>
        <div
          className={css(({ v }) => ({
            fontSize: "0.875rem",
            color: v("--c-text-muted"),
          }))}
        >
          Last updated: Project #{project.id}
        </div>
      </div>
      <div
        className={css({
          display: "flex",
          justifyContent: "flex-end",
        })}
      >
        <button
          onClick={handleViewClick}
          className={clsx(
            Styles.cardButton,
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
          View
        </button>
      </div>
    </div>
  );
}

function Projects() {
  const loaderData = Route.useLoaderData();
  const router = useRouter();

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      // Invalidate the current route's loader data to refetch projects
      await router.invalidate();
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    },
  });

  return (
    <Layout userEmail={loaderData.user.email}>
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
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
          <button
            onClick={() => createProjectMutation.mutate(undefined)}
            disabled={createProjectMutation.isPending}
            className={css(({ v }) => ({
              backgroundColor: v("--c-success"),
              color: v("--c-text-alt"),
              padding: "0.75rem 1.5rem",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.875rem",
              fontWeight: "500",
              "&:hover": {
                backgroundColor: `oklch(from ${v(
                  "--c-success"
                )} calc(l - 0.05) c h)`,
              },
              "&:disabled": {
                backgroundColor: `oklch(from ${v("--c-text-muted")} l 0 h)`,
                cursor: "not-allowed",
              },
            }))}
          >
            {createProjectMutation.isPending ? "Creating..." : "+ New Project"}
          </button>
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
          {loaderData.projects.length > 0 ? (
            loaderData.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
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
            This page now shows your real projects from the database. Click "New
            Project" to create an empty project, and "View" to navigate to
            project details.
          </p>
        </div>
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
    cursor: "pointer",
    transition: "all 0.2s",
  })),
  cardButton: css({
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "500",
    transition: "all 0.2s",
  }),
};
