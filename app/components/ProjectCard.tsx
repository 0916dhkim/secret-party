import { css } from "@flow-css/core/css";

export interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    environmentCount: number;
    secretCount: number;
    environments: Array<{
      id: number;
      name: string;
      secretCount: number;
    }>;
  };
  onDelete?: (projectId: number) => void;
  showActions?: boolean;
}

export function ProjectCard({ 
  project, 
  onDelete, 
  showActions = true 
}: ProjectCardProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm(`Are you sure you want to delete "${project.name}"? This will delete all environments and secrets in this project.`)) {
      onDelete(project.id);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            <a href={`/projects/${project.id}`} className={styles.titleLink}>
              {project.name}
            </a>
          </h3>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <span className={styles.statNumber}>{project.environmentCount}</span>
              <span className={styles.statLabel}>
                environment{project.environmentCount !== 1 ? 's' : ''}
              </span>
            </span>
            <span className={styles.statSeparator}>•</span>
            <span className={styles.stat}>
              <span className={styles.statNumber}>{project.secretCount}</span>
              <span className={styles.statLabel}>
                secret{project.secretCount !== 1 ? 's' : ''}
              </span>
            </span>
          </div>
        </div>
        
        {showActions && (
          <div className={styles.actions}>
            <a 
              href={`/projects/${project.id}`}
              className={styles.viewButton}
            >
              View
            </a>
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className={styles.deleteButton}
                title="Delete project"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {project.environments.length > 0 && (
        <div className={styles.environmentsSection}>
          <h4 className={styles.environmentsTitle}>Environments</h4>
          <div className={styles.environmentsList}>
            {project.environments.map((env) => (
              <a
                key={env.id}
                href={`/projects/${project.id}/environments/${env.id}`}
                className={styles.environmentItem}
              >
                <span className={styles.environmentName}>{env.name}</span>
                <span className={styles.environmentSecretCount}>
                  {env.secretCount} secret{env.secretCount !== 1 ? 's' : ''}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {project.environments.length === 0 && (
        <div className={styles.emptyEnvironments}>
          <span>No environments yet</span>
          <a 
            href={`/projects/${project.id}`}
            className={styles.addEnvironmentLink}
          >
            Add environment →
          </a>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: css({
    backgroundColor: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "1.5rem",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: "#007bff",
      boxShadow: "0 2px 8px rgba(0, 123, 255, 0.1)",
    },
  }),

  header: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  }),

  titleSection: css({
    flex: 1,
  }),

  title: css({
    margin: "0 0 0.5rem 0",
    fontSize: "1.25rem",
    fontWeight: "600",
  }),

  titleLink: css({
    color: "#212529",
    textDecoration: "none",
    "&:hover": {
      color: "#007bff",
    },
  }),

  stats: css({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem",
    color: "#6c757d",
  }),

  stat: css({
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  }),

  statNumber: css({
    fontWeight: "600",
    color: "#007bff",
  }),

  statLabel: css({
    fontSize: "0.85rem",
  }),

  statSeparator: css({
    color: "#dee2e6",
  }),

  actions: css({
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-start",
  }),

  viewButton: css({
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    textDecoration: "none",
    display: "inline-block",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#0056b3",
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

  environmentsSection: css({
    borderTop: "1px solid #e9ecef",
    paddingTop: "1rem",
  }),

  environmentsTitle: css({
    margin: "0 0 0.75rem 0",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#495057",
  }),

  environmentsList: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),

  environmentItem: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0.75rem",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px",
    textDecoration: "none",
    color: "inherit",
    transition: "all 0.2s",
    "&:hover": {
      backgroundColor: "#e9ecef",
      color: "#007bff",
    },
  }),

  environmentName: css({
    fontWeight: "500",
    fontSize: "0.9rem",
  }),

  environmentSecretCount: css({
    fontSize: "0.8rem",
    color: "#6c757d",
  }),

  emptyEnvironments: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px",
    border: "1px dashed #dee2e6",
    fontSize: "0.9rem",
    color: "#6c757d",
  }),

  addEnvironmentLink: css({
    color: "#007bff",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: "500",
    "&:hover": {
      textDecoration: "underline",
    },
  }),
};