import { css } from "@flow-css/core/css";
import { requireAuth } from "../auth/session";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "../db/db";
import { eq } from "drizzle-orm";
import { projectTable, environmentTable, apiClientTable, environmentAccessTable } from "../db/schema";
import { useState } from "react";
import { PasswordConfirmationModal } from "../components/PasswordConfirmationModal";

export const Route = createFileRoute("/api-keys")({
  component: APIKeysManagement,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAuth();
  
  // Get user's projects with environments for API key creation
  const projects = await db.query.projectTable.findMany({
    where: eq(projectTable.ownerId, session.user.id),
    with: {
      environments: true,
    },
  });

  // Get all API clients (for now, just mock data since we don't have user-specific API clients)
  // In a real implementation, you'd want to link API clients to users
  const apiClients = await db.query.apiClientTable.findMany({
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

  return { 
    user: session.user,
    projects: projects.map(p => ({
      id: p.id,
      name: `Project ${p.id}`,
      environments: p.environments.map(e => ({
        id: e.id,
        name: e.name,
        projectId: p.id,
      })),
    })),
    apiClients: apiClients.map(client => ({
      id: client.id,
      name: client.name,
      publicKey: client.publicKey.substring(0, 50) + "...", // Truncated for display
      createdAt: new Date().toISOString(), // TODO: Add created_at field to schema
      environments: client.access.map(access => ({
        id: access.environment.id,
        name: access.environment.name,
        projectName: `Project ${access.environment.project.id}`,
      })),
    })),
  };
});

function APIKeysManagement() {
  const loaderData = Route.useLoaderData();
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [apiClients, setApiClients] = useState(loaderData.apiClients);

  const handlePasswordConfirmed = (password: string) => {
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

  const handleDeleteAPIKey = (clientId: number) => {
    requirePassword(() => {
      // TODO: Implement delete API key server action
      setApiClients(prev => prev.filter(c => c.id !== clientId));
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <a href="/dashboard" className={styles.breadcrumbLink}>Dashboard</a>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>API Keys</span>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>API Keys</h1>
          <p className={styles.subtitle}>
            Manage API keys for programmatic access to your secrets
          </p>
        </div>
        <div className={styles.actions}>
          <button
            onClick={() => setShowCreateKey(true)}
            className={styles.createButton}
          >
            Create API Key
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {apiClients.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No API keys yet</h3>
            <p>Create your first API key to access secrets programmatically.</p>
            <button
              onClick={() => setShowCreateKey(true)}
              className={styles.createButton}
            >
              Create Your First API Key
            </button>
          </div>
        ) : (
          <div className={styles.keysTable}>
            <div className={styles.tableHeader}>
              <div className={styles.headerCell}>Name</div>
              <div className={styles.headerCell}>Public Key</div>
              <div className={styles.headerCell}>Environments</div>
              <div className={styles.headerCell}>Created</div>
              <div className={styles.headerCell}>Actions</div>
            </div>
            {apiClients.map((client) => (
              <div key={client.id} className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <span className={styles.clientName}>{client.name}</span>
                </div>
                <div className={styles.tableCell}>
                  <code className={styles.publicKey}>{client.publicKey}</code>
                </div>
                <div className={styles.tableCell}>
                  <div className={styles.environmentList}>
                    {client.environments.map((env) => (
                      <span key={env.id} className={styles.environmentBadge}>
                        {env.projectName} / {env.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.tableCell}>
                  <span className={styles.createdDate}>
                    {new Date(client.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.tableCell}>
                  <div className={styles.rowActions}>
                    <button className={styles.editButton}>Edit</button>
                    <button
                      onClick={() => handleDeleteAPIKey(client.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateKey && (
        <CreateAPIKeyModal
          projects={loaderData.projects}
          onClose={() => setShowCreateKey(false)}
          onSuccess={(newClient) => {
            setApiClients(prev => [...prev, newClient]);
            setShowCreateKey(false);
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

interface CreateAPIKeyModalProps {
  projects: Array<{
    id: number;
    name: string;
    environments: Array<{
      id: number;
      name: string;
      projectId: number;
    }>;
  }>;
  onClose: () => void;
  onSuccess: (client: any) => void;
}

function CreateAPIKeyModal({ projects, onClose, onSuccess }: CreateAPIKeyModalProps) {
  const [name, setName] = useState("");
  const [selectedEnvironments, setSelectedEnvironments] = useState<number[]>([]);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [generatedKeys, setGeneratedKeys] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedEnvironments.length === 0 || !password.trim()) {
      setError("All fields are required and at least one environment must be selected");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // TODO: Implement createAPIClient server action
      // This would:
      // 1. Verify password
      // 2. Generate RSA key pair
      // 3. Create API client record
      // 4. Create environment access records with DEKs encrypted by public key
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Mock generated keys
      const mockKeys = {
        publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEA...\n-----END PRIVATE KEY-----",
      };
      
      setGeneratedKeys(mockKeys);
      setStep(2);
      
      // Add to parent list
      const newClient = {
        id: Date.now(), // Mock ID
        name,
        publicKey: mockKeys.publicKey.substring(0, 50) + "...",
        createdAt: new Date().toISOString(),
        environments: selectedEnvironments.map(envId => {
          const env = projects.flatMap(p => p.environments).find(e => e.id === envId);
          const project = projects.find(p => p.environments.some(e => e.id === envId));
          return {
            id: envId,
            name: env?.name || "",
            projectName: project?.name || "",
          };
        }),
      };
      
      onSuccess(newClient);
    } catch (error: any) {
      setError(error.message || "Failed to create API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnvironmentToggle = (envId: number) => {
    setSelectedEnvironments(prev =>
      prev.includes(envId)
        ? prev.filter(id => id !== envId)
        : [...prev, envId]
    );
  };

  if (step === 2 && generatedKeys) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>API Key Created Successfully</h2>
            <button onClick={onClose} className={styles.closeButton}>×</button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.warning}>
              <strong>⚠️ Important:</strong> Save your private key now. You won't be able to see it again.
            </div>
            
            <div className={styles.keySection}>
              <h3>Public Key (for server configuration):</h3>
              <textarea
                value={generatedKeys.publicKey}
                readOnly
                className={styles.keyTextarea}
                rows={8}
              />
            </div>
            
            <div className={styles.keySection}>
              <h3>Private Key (keep this secret):</h3>
              <textarea
                value={generatedKeys.privateKey}
                readOnly
                className={styles.keyTextarea}
                rows={12}
              />
            </div>
            
            <div className={styles.modalActions}>
              <button onClick={onClose} className={styles.doneButton}>
                I've Saved the Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create API Key</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="api-key-name" className={styles.label}>
              API Key Name
            </label>
            <input
              id="api-key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Server, CI/CD Pipeline"
              className={styles.input}
              disabled={isSubmitting}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Environment Access
            </label>
            <div className={styles.environmentSelector}>
              {projects.map((project) => (
                <div key={project.id} className={styles.projectGroup}>
                  <h4 className={styles.projectName}>{project.name}</h4>
                  {project.environments.map((env) => (
                    <label key={env.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedEnvironments.includes(env.id)}
                        onChange={() => handleEnvironmentToggle(env.id)}
                        disabled={isSubmitting}
                        className={styles.checkbox}
                      />
                      {env.name}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="user-password" className={styles.label}>
              Your Password (to encrypt environment access)
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
              disabled={!name.trim() || selectedEnvironments.length === 0 || !password.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create API Key"}
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

  keysTable: css({
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    overflow: "hidden",
  }),

  tableHeader: css({
    display: "grid",
    gridTemplateColumns: "200px 300px 1fr 120px 150px",
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
    gridTemplateColumns: "200px 300px 1fr 120px 150px",
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

  clientName: css({
    fontWeight: "500",
    color: "#495057",
  }),

  publicKey: css({
    fontFamily: "monospace",
    fontSize: "0.8rem",
    color: "#6c757d",
    backgroundColor: "#f8f9fa",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
  }),

  environmentList: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  }),

  environmentBadge: css({
    backgroundColor: "#e9ecef",
    color: "#495057",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.8rem",
  }),

  createdDate: css({
    fontSize: "0.9rem",
    color: "#6c757d",
  }),

  rowActions: css({
    display: "flex",
    gap: "0.5rem",
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
    maxWidth: "600px",
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

  modalBody: css({
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

  environmentSelector: css({
    border: "1px solid #ced4da",
    borderRadius: "4px",
    padding: "1rem",
    maxHeight: "200px",
    overflowY: "auto",
  }),

  projectGroup: css({
    marginBottom: "1rem",
    "&:last-child": {
      marginBottom: 0,
    },
  }),

  projectName: css({
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#495057",
    margin: "0 0 0.5rem 0",
  }),

  checkboxLabel: css({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem 0",
    fontSize: "0.9rem",
    cursor: "pointer",
  }),

  checkbox: css({
    margin: 0,
  }),

  warning: css({
    backgroundColor: "#fff3cd",
    border: "1px solid #ffeaa7",
    borderRadius: "4px",
    padding: "1rem",
    marginBottom: "1.5rem",
    color: "#856404",
  }),

  keySection: css({
    marginBottom: "1.5rem",
    "& h3": {
      margin: "0 0 0.5rem 0",
      fontSize: "1rem",
      fontWeight: "600",
      color: "#495057",
    },
  }),

  keyTextarea: css({
    width: "100%",
    fontFamily: "monospace",
    fontSize: "0.8rem",
    padding: "0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    backgroundColor: "#f8f9fa",
    resize: "none",
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

  doneButton: css({
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.75rem 1.5rem",
    fontSize: "0.9rem",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#218838",
    },
  }),
};