import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/db";
import { eq } from "drizzle-orm";
import { projectTable, environmentTable, secretTable } from "../db/schema";
import { NavigationMenu } from "../components/NavigationMenu";
import { ProjectCard } from "../components/ProjectCard";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  
  // Get user's projects with stats
  const projects = await db.query.projectTable.findMany({
    where: eq(projectTable.ownerId, session.user.id),
    with: {
      environments: {
        with: {
          secrets: true,
        },
      },
    },
  });

  // Calculate statistics
  const stats = {
    totalProjects: projects.length,
    totalEnvironments: projects.reduce((acc, p) => acc + p.environments.length, 0),
    totalSecrets: projects.reduce((acc, p) => 
      acc + p.environments.reduce((envAcc, e) => envAcc + e.secrets.length, 0), 0),
    totalAPIKeys: 0, // TODO: Count API keys when that table is implemented
  };

  return { 
    user: session.user, 
    projects: projects.map(p => ({
      id: p.id,
      name: `Project ${p.id}`, // TODO: Add name field to projects table
      environmentCount: p.environments.length,
      secretCount: p.environments.reduce((acc, e) => acc + e.secrets.length, 0),
      environments: p.environments.map(e => ({
        id: e.id,
        name: e.name,
        secretCount: e.secrets.length,
      })),
    })),
    stats
  };
});

function Dashboard() {
  const loaderData = Route.useLoaderData();

  return (
    <>
      <NavigationMenu currentPath="/dashboard" userEmail={loaderData.user.email} />
      <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.userInfo}>
          <span>Welcome, {loaderData.user.email}</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3 className={styles.statNumber}>{loaderData.stats.totalProjects}</h3>
          <p className={styles.statLabel}>Projects</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statNumber}>{loaderData.stats.totalEnvironments}</h3>
          <p className={styles.statLabel}>Environments</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statNumber}>{loaderData.stats.totalSecrets}</h3>
          <p className={styles.statLabel}>Secrets</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statNumber}>{loaderData.stats.totalAPIKeys}</h3>
          <p className={styles.statLabel}>API Keys</p>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          <a href="/projects/new" className={styles.createButton}>
            Create Project
          </a>
        </div>

        {loaderData.projects.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No projects yet. Create your first project to get started.</p>
            <a href="/projects/new" className={styles.createButton}>
              Create Your First Project
            </a>
          </div>
        ) : (
          <div className={styles.projectsGrid}>
            {loaderData.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={(projectId) => {
                  // TODO: Implement delete project functionality
                  console.log("Delete project", projectId);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <a href="/projects/new" className={styles.actionCard}>
            <h3>Create Project</h3>
            <p>Set up a new project with environments</p>
          </a>
          <a href="/api-keys" className={styles.actionCard}>
            <h3>Manage API Keys</h3>
            <p>Create and manage API access keys</p>
          </a>
          <a href="/account" className={styles.actionCard}>
            <h3>Account Settings</h3>
            <p>Update your account and security settings</p>
          </a>
        </div>
      </div>
    </div>
    </>
  );
}

const styles = {
  container: css({
    padding: "2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  }),

  header: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  }),

  title: css({
    fontSize: "2rem",
    fontWeight: "600",
    margin: 0,
    color: "#212529",
  }),

  userInfo: css({
    color: "#6c757d",
    fontSize: "0.9rem",
  }),

  statsGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "3rem",
  }),

  statCard: css({
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "1.5rem",
    textAlign: "center",
  }),

  statNumber: css({
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "0 0 0.5rem 0",
    color: "#007bff",
  }),

  statLabel: css({
    margin: 0,
    color: "#6c757d",
    fontSize: "0.9rem",
    fontWeight: "500",
  }),

  section: css({
    marginBottom: "3rem",
  }),

  sectionHeader: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  }),

  sectionTitle: css({
    fontSize: "1.5rem",
    fontWeight: "600",
    margin: 0,
    color: "#212529",
  }),

  createButton: css({
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "0.75rem 1.5rem",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: "500",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#0056b3",
    },
  }),

  emptyState: css({
    textAlign: "center",
    padding: "3rem",
    background: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  }),

  projectsGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "1.5rem",
  }),

  projectCard: css({
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "1.5rem",
  }),

  projectHeader: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  }),

  projectName: css({
    fontSize: "1.25rem",
    fontWeight: "600",
    margin: 0,
    color: "#212529",
  }),

  projectLink: css({
    color: "#007bff",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "0.9rem",
    "&:hover": {
      textDecoration: "underline",
    },
  }),

  projectStats: css({
    display: "flex",
    gap: "2rem",
    marginBottom: "1rem",
  }),

  projectStat: css({
    textAlign: "center",
  }),

  projectStatNumber: css({
    display: "block",
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#007bff",
  }),

  projectStatLabel: css({
    fontSize: "0.8rem",
    color: "#6c757d",
  }),

  environmentList: css({
    borderTop: "1px solid #e9ecef",
    paddingTop: "1rem",
  }),

  environmentListTitle: css({
    fontSize: "0.9rem",
    fontWeight: "600",
    margin: "0 0 0.5rem 0",
    color: "#495057",
  }),

  environmentItem: css({
    marginBottom: "0.25rem",
  }),

  environmentLink: css({
    color: "#007bff",
    textDecoration: "none",
    fontSize: "0.9rem",
    "&:hover": {
      textDecoration: "underline",
    },
  }),

  quickActions: css({
    marginTop: "3rem",
  }),

  actionGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1rem",
  }),

  actionCard: css({
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "1.5rem",
    textDecoration: "none",
    color: "inherit",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: "#007bff",
      boxShadow: "0 2px 8px rgba(0, 123, 255, 0.1)",
    },
    "& h3": {
      margin: "0 0 0.5rem 0",
      color: "#212529",
      fontSize: "1.1rem",
    },
    "& p": {
      margin: 0,
      color: "#6c757d",
      fontSize: "0.9rem",
    },
  }),
};