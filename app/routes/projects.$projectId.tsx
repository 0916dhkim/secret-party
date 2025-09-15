import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/db";
import { eq, and } from "drizzle-orm";
import { projectTable, environmentTable, secretTable } from "../db/schema";
import { useState } from "react";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetail,
  loader: async ({ params }) => await loader({ projectId: parseInt(params.projectId) }),
});

const loader = createServerFn({
  method: "GET",
}).handler(async ({ projectId }: { projectId: number }) => {
  const session = await requireAuth();
  
  // Get project with environments and secrets
  const project = await db.query.projectTable.findFirst({
    where: and(
      eq(projectTable.id, projectId),
      eq(projectTable.ownerId, session.user.id)
    ),
    with: {
      environments: {
        with: {
          secrets: true,
        },
      },
    },
  });

  if (!project) {
    throw notFound();
  }

  return { 
    user: session.user,
    project: {
      id: project.id,
      name: `Project ${project.id}`,
      environments: project.environments.map(env => ({
        id: env.id,
        name: env.name,
        secretCount: env.secrets.length,
        secrets: env.secrets.map(secret => ({
          key: secret.key,
          // Don't include actual values for security
        })),
      })),
    },
  };
});

function ProjectDetail() {
  const loaderData = Route.useLoaderData();
  const { project } = loaderData;
  const [showCreateEnvironment, setShowCreateEnvironment] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <a href="/dashboard" className={styles.breadcrumbLink}>Dashboard</a>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{project.name}</span>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{project.name}</h1>
          <p className={styles.subtitle}>
            {project.environments.length} environment(s), {" "}
            {project.environments.reduce((acc, env) => acc + env.secretCount, 0)} secret(s) total
          </p>
        </div>
        <div className={styles.actions}>
          <button
            onClick={() => setShowCreateEnvironment(true)}
            className={styles.createButton}
          >
            Create Environment
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {project.environments.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No environments yet</h3>
            <p>Environments help you organize secrets by deployment stage (dev, staging, production).</p>
            <button
              onClick={() => setShowCreateEnvironment(true)}
              className={styles.createButton}
            >
              Create Your First Environment
            </button>
          </div>
        ) : (
          <div className={styles.environmentsGrid}>
            {project.environments.map((environment) => (
              <div key={environment.id} className={styles.environmentCard}>
                <div className={styles.environmentHeader}>
                  <h3 className={styles.environmentName}>{environment.name}</h3>
                  <div className={styles.environmentStats}>
                    <span className={styles.secretCount}>
                      {environment.secretCount} secrets
                    </span>
                  </div>
                </div>
                <div className={styles.environmentActions}>
                  <a 
                    href={`/projects/${project.id}/environments/${environment.id}`}
                    className={styles.viewButton}
                  >
                    Manage Secrets
                  </a>
                  <button className={styles.deleteButton}>
                    Delete
                  </button>
                </div>
                {environment.secrets.length > 0 && (
                  <div className={styles.secretPreview}>
                    <h4 className={styles.secretPreviewTitle}>Secret Keys:</h4>
                    <div className={styles.secretKeys}>
                      {environment.secrets.slice(0, 5).map((secret) => (
                        <span key={secret.key} className={styles.secretKey}>
                          {secret.key}
                        </span>
                      ))}
                      {environment.secrets.length > 5 && (
                        <span className={styles.secretKey}>
                          +{environment.secrets.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Environment Modal */}
      {showCreateEnvironment && (
        <CreateEnvironmentModal
          projectId={project.id}
          onClose={() => setShowCreateEnvironment(false)}
          onSuccess={() => {
            setShowCreateEnvironment(false);
            // In a real app, we'd refresh the data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function CreateEnvironmentModal({ 
  projectId, 
  onClose, 
  onSuccess 
}: { 
  projectId: number; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError("Name and password are required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // TODO: Implement createEnvironment server action
      // This would create environment with DEK encrypted by password
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSuccess();
    } catch (error: any) {
      setError(error.message || "Failed to create environment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create Environment</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="env-name" className={styles.label}>
              Environment Name
            </label>
            <input
              id="env-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., development, staging, production"
              className={styles.input}
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="env-password" className={styles.label}>
              Your Password (to encrypt environment secrets)
            </label>
            <input
              id="env-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
              className={styles.input}
              disabled={isSubmitting}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={!name.trim() || !password.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Environment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: css({
    padding: "2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  }),

  breadcrumb: css({
    marginBottom: "1rem",
    fontSize: "0.9rem",
    color: "#6c757d",
  }),

  breadcrumbLink: css({
    color: "#007bff",
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  }),

  breadcrumbSeparator: css({
    margin: "0 0.5rem",
  }),

  breadcrumbCurrent: css({
    color: "#495057",
  }),

  header: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
  }),

  title: css({
    fontSize: "2rem",
    fontWeight: "600",
    margin: 0,
    color: "#212529",
  }),

  subtitle: css({
    margin: "0.5rem 0 0 0",
    color: "#6c757d",
    fontSize: "0.9rem",
  }),

  actions: css({
    display: "flex",
    gap: "1rem",
  }),

  createButton: css({
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "0.75rem 1.5rem",
    fontSize: "0.9rem",
    fontWeight: "500",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#0056b3",
    },
    "&:disabled": {
      backgroundColor: "#6c757d",
      cursor: "not-allowed",
    },
  }),

  content: css({
    minHeight: "400px",
  }),

  emptyState: css({
    textAlign: "center",
    padding: "4rem 2rem",
    background: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
    "& h3": {
      margin: "0 0 1rem 0",
      color: "#495057",
    },
    "& p": {
      margin: "0 0 2rem 0",
      color: "#6c757d",
    },
  }),

  environmentsGrid: css({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "1.5rem",
  }),

  environmentCard: css({
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "1.5rem",
  }),

  environmentHeader: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  }),

  environmentName: css({
    fontSize: "1.25rem",
    fontWeight: "600",
    margin: 0,
    color: "#212529",
  }),

  environmentStats: css({
    fontSize: "0.9rem",
    color: "#6c757d",
  }),

  secretCount: css({
    fontWeight: "500",
  }),

  environmentActions: css({
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1rem",
  }),

  viewButton: css({
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    textDecoration: "none",
    "&:hover": {
      backgroundColor: "#218838",
    },
  }),

  deleteButton: css({
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#c82333",
    },
  }),

  secretPreview: css({
    borderTop: "1px solid #e9ecef",
    paddingTop: "1rem",
  }),

  secretPreviewTitle: css({
    fontSize: "0.9rem",
    fontWeight: "600",
    margin: "0 0 0.5rem 0",
    color: "#495057",
  }),

  secretKeys: css({
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  }),

  secretKey: css({
    background: "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: "4px",
    padding: "0.25rem 0.5rem",
    fontSize: "0.8rem",
    color: "#495057",
  }),

  // Modal styles
  modalOverlay: css({
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  }),

  modal: css({
    background: "white",
    borderRadius: "8px",
    padding: 0,
    width: "90vw",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflow: "auto",
  }),

  modalHeader: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    borderBottom: "1px solid #e9ecef",
    "& h2": {
      margin: 0,
      fontSize: "1.25rem",
      fontWeight: "600",
    },
  }),

  closeButton: css({
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.25rem",
    color: "#6c757d",
    "&:hover": {
      color: "#495057",
    },
  }),

  modalForm: css({
    padding: "1.5rem",
  }),

  formGroup: css({
    marginBottom: "1.5rem",
  }),

  label: css({
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: "500",
    color: "#495057",
  }),

  input: css({
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    fontSize: "1rem",
    "&:focus": {
      outline: "none",
      borderColor: "#007bff",
      boxShadow: "0 0 0 2px rgba(0, 123, 255, 0.25)",
    },
    "&:disabled": {
      backgroundColor: "#f8f9fa",
      cursor: "not-allowed",
    },
  }),

  error: css({
    color: "#dc3545",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  }),

  modalActions: css({
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
  }),

  cancelButton: css({
    backgroundColor: "transparent",
    color: "#6c757d",
    border: "1px solid #6c757d",
    borderRadius: "4px",
    padding: "0.75rem 1.5rem",
    fontSize: "0.9rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f8f9fa",
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  }),
};