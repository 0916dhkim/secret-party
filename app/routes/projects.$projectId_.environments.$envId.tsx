import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/db";
import { eq, and } from "drizzle-orm";
import { projectTable, environmentTable, secretTable } from "../db/schema";
import { useState } from "react";
import { PasswordConfirmationModal } from "../components/PasswordConfirmationModal";

export const Route = createFileRoute("/projects/$projectId_/environments/$envId")({
  component: EnvironmentDetail,
  loader: async ({ params }) => await loader({ 
    projectId: parseInt(params.projectId),
    envId: parseInt(params.envId),
  }),
});

const loader = createServerFn({
  method: "GET",
}).handler(async ({ projectId, envId }: { projectId: number; envId: number }) => {
  const session = await requireAuth();
  
  // Get environment with project ownership check
  const environment = await db.query.environmentTable.findFirst({
    where: eq(environmentTable.id, envId),
    with: {
      project: true,
      secrets: true,
    },
  });

  if (!environment || environment.project.ownerId !== session.user.id) {
    throw notFound();
  }

  return { 
    user: session.user,
    project: {
      id: environment.project.id,
      name: `Project ${environment.project.id}`,
    },
    environment: {
      id: environment.id,
      name: environment.name,
      secrets: environment.secrets.map(secret => ({
        key: secret.key,
        // Don't include actual encrypted values in the initial load
        hasValue: !!secret.valueEncrypted,
      })),
    },
  };
});

function EnvironmentDetail() {
  const loaderData = Route.useLoaderData();
  const { project, environment } = loaderData;
  
  const [showCreateSecret, setShowCreateSecret] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [secrets, setSecrets] = useState(environment.secrets);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSecrets = secrets.filter(secret =>
    secret.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePasswordConfirmed = (password: string) => {
    // TODO: Store password in memory for sensitive operations
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setShowPasswordModal(false);
  };

  const requirePassword = (action: () => void) => {
    setPendingAction(() => action);
    setShowPasswordModal(true);
  };

  const handleDeleteSecret = (secretKey: string) => {
    requirePassword(() => {
      // TODO: Implement delete secret server action
      setSecrets(prev => prev.filter(s => s.key !== secretKey));
    });
  };

  const handleViewSecret = (secretKey: string) => {
    requirePassword(() => {
      // TODO: Implement view secret functionality
      console.log("Viewing secret:", secretKey);
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <a href="/dashboard" className={styles.breadcrumbLink}>Dashboard</a>
        <span className={styles.breadcrumbSeparator}>/</span>
        <a href={`/projects/${project.id}`} className={styles.breadcrumbLink}>
          {project.name}
        </a>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{environment.name}</span>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{environment.name}</h1>
          <p className={styles.subtitle}>
            {secrets.length} secret(s) in this environment
          </p>
        </div>
        <div className={styles.actions}>
          <button
            onClick={() => setShowCreateSecret(true)}
            className={styles.createButton}
          >
            Add Secret
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {secrets.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No secrets yet</h3>
            <p>Add your first secret to this environment to get started.</p>
            <button
              onClick={() => setShowCreateSecret(true)}
              className={styles.createButton}
            >
              Add Your First Secret
            </button>
          </div>
        ) : (
          <>
            <div className={styles.controls}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  placeholder="Search secrets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.bulkActions}>
                <button className={styles.bulkButton}>Export All</button>
                <button className={styles.bulkButton}>Import Secrets</button>
              </div>
            </div>

            <div className={styles.secretsTable}>
              <div className={styles.tableHeader}>
                <div className={styles.headerCell}>Key</div>
                <div className={styles.headerCell}>Status</div>
                <div className={styles.headerCell}>Actions</div>
              </div>
              {filteredSecrets.map((secret) => (
                <div key={secret.key} className={styles.tableRow}>
                  <div className={styles.tableCell}>
                    <span className={styles.secretKey}>{secret.key}</span>
                  </div>
                  <div className={styles.tableCell}>
                    <span className={styles.statusBadge}>
                      {secret.hasValue ? "Set" : "Empty"}
                    </span>
                  </div>
                  <div className={styles.tableCell}>
                    <div className={styles.rowActions}>
                      <button
                        onClick={() => handleViewSecret(secret.key)}
                        className={styles.viewButton}
                      >
                        View
                      </button>
                      <button className={styles.editButton}>Edit</button>
                      <button
                        onClick={() => handleDeleteSecret(secret.key)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Secret Modal */}
      {showCreateSecret && (
        <CreateSecretModal
          projectId={project.id}
          environmentId={environment.id}
          onClose={() => setShowCreateSecret(false)}
          onSuccess={(newSecret) => {
            setSecrets(prev => [...prev, newSecret]);
            setShowCreateSecret(false);
          }}
        />
      )}

      {/* Password Confirmation Modal */}
      <PasswordConfirmationModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingAction(null);
        }}
        onConfirm={handlePasswordConfirmed}
        title="Confirm Password"
        description="Please enter your password to perform this sensitive operation."
      />
    </div>
  );
}

function CreateSecretModal({ 
  projectId,
  environmentId, 
  onClose, 
  onSuccess 
}: { 
  projectId: number;
  environmentId: number; 
  onClose: () => void; 
  onSuccess: (secret: { key: string; hasValue: boolean }) => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // TODO: Implement createSecret server action
      // This would:
      // 1. Verify password
      // 2. Decrypt environment DEK with password
      // 3. Encrypt secret value with DEK
      // 4. Store encrypted secret
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onSuccess({ key, hasValue: true });
    } catch (error: any) {
      setError(error.message || "Failed to create secret");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add Secret</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="secret-key" className={styles.label}>
              Secret Key
            </label>
            <input
              id="secret-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g., DATABASE_URL, API_KEY"
              className={styles.input}
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="secret-value" className={styles.label}>
              Secret Value
            </label>
            <textarea
              id="secret-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter the secret value"
              className={styles.textarea}
              disabled={isSubmitting}
              rows={4}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="user-password" className={styles.label}>
              Your Password (to encrypt this secret)
            </label>
            <input
              id="user-password"
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
              disabled={!key.trim() || !value.trim() || !password.trim() || isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Secret"}
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

  controls: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    gap: "1rem",
  }),

  searchBox: css({
    flex: 1,
    maxWidth: "400px",
  }),

  searchInput: css({
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
  }),

  bulkActions: css({
    display: "flex",
    gap: "0.75rem",
  }),

  bulkButton: css({
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#545b62",
    },
  }),

  secretsTable: css({
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    overflow: "hidden",
  }),

  tableHeader: css({
    display: "grid",
    gridTemplateColumns: "1fr 120px 200px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
  }),

  headerCell: css({
    padding: "1rem",
    fontWeight: "600",
    color: "#495057",
    fontSize: "0.9rem",
  }),

  tableRow: css({
    display: "grid",
    gridTemplateColumns: "1fr 120px 200px",
    borderBottom: "1px solid #e9ecef",
    "&:hover": {
      backgroundColor: "#f8f9fa",
    },
    "&:last-child": {
      borderBottom: "none",
    },
  }),

  tableCell: css({
    padding: "1rem",
    display: "flex",
    alignItems: "center",
  }),

  secretKey: css({
    fontFamily: "monospace",
    fontSize: "0.9rem",
    color: "#495057",
    fontWeight: "500",
  }),

  statusBadge: css({
    backgroundColor: "#28a745",
    color: "white",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.8rem",
    fontWeight: "500",
  }),

  rowActions: css({
    display: "flex",
    gap: "0.5rem",
  }),

  viewButton: css({
    backgroundColor: "#17a2b8",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.375rem 0.75rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#138496",
    },
  }),

  editButton: css({
    backgroundColor: "#ffc107",
    color: "#212529",
    border: "none",
    borderRadius: "4px",
    padding: "0.375rem 0.75rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#e0a800",
    },
  }),

  deleteButton: css({
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.375rem 0.75rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#c82333",
    },
  }),

  // Modal styles (reused from project detail)
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

  textarea: css({
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    fontSize: "1rem",
    resize: "vertical",
    minHeight: "100px",
    fontFamily: "monospace",
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