import { css } from "@flow-css/core/css";
import { useState } from "react";
import { PasswordConfirmationModal } from "./PasswordConfirmationModal";

export interface SecretFormProps {
  mode: "create" | "edit";
  initialKey?: string;
  initialValue?: string;
  projectId: number;
  environmentId: number;
  onSubmit: (data: { key: string; value: string; password: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SecretForm({
  mode,
  initialKey = "",
  initialValue = "",
  projectId,
  environmentId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SecretFormProps) {
  const [key, setKey] = useState(initialKey);
  const [value, setValue] = useState(initialValue);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) {
      setError("Both key and value are required");
      return;
    }
    setShowPasswordModal(true);
  };

  const handlePasswordConfirmed = async (password: string) => {
    setError("");
    try {
      await onSubmit({ key: key.trim(), value: value.trim(), password });
      setShowPasswordModal(false);
    } catch (error: any) {
      setError(error.message || "Failed to save secret");
      setShowPasswordModal(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="secret-key" className={styles.label}>
            Secret Key
          </label>
          <input
            id="secret-key"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g., DATABASE_URL, API_KEY, JWT_SECRET"
            className={styles.input}
            disabled={isSubmitting || (mode === "edit" && !!initialKey)}
            autoFocus
          />
          <div className={styles.hint}>
            Use uppercase letters and underscores for environment variable names
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="secret-value" className={styles.label}>
            Secret Value
          </label>
          <textarea
            id="secret-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter the secret value (passwords, tokens, etc.)"
            className={styles.textarea}
            disabled={isSubmitting}
            rows={6}
          />
          <div className={styles.hint}>
            This value will be encrypted before storage
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={!key.trim() || !value.trim() || isSubmitting}
          >
            {isSubmitting ? "Saving..." : mode === "create" ? "Add Secret" : "Update Secret"}
          </button>
        </div>
      </form>

      <PasswordConfirmationModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirmed}
        title="Confirm Password"
        description={`Please enter your password to ${mode === "create" ? "encrypt and save" : "update"} this secret.`}
      />
    </>
  );
}

const styles = {
  form: css({
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  }),

  formGroup: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),

  label: css({
    fontWeight: "600",
    color: "#495057",
    fontSize: "0.9rem",
  }),

  input: css({
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    fontSize: "1rem",
    fontFamily: "monospace",
    "&:focus": {
      outline: "none",
      borderColor: "#007bff",
      boxShadow: "0 0 0 2px rgba(0, 123, 255, 0.25)",
    },
    "&:disabled": {
      backgroundColor: "#f8f9fa",
      cursor: "not-allowed",
      color: "#6c757d",
    },
  }),

  textarea: css({
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    fontSize: "1rem",
    fontFamily: "monospace",
    resize: "vertical",
    minHeight: "120px",
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

  hint: css({
    fontSize: "0.8rem",
    color: "#6c757d",
    fontStyle: "italic",
  }),

  error: css({
    color: "#dc3545",
    fontSize: "0.875rem",
    padding: "0.5rem",
    backgroundColor: "#f8d7da",
    border: "1px solid #f5c6cb",
    borderRadius: "4px",
  }),

  actions: css({
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    paddingTop: "1rem",
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

  submitButton: css({
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.75rem 1.5rem",
    fontSize: "0.9rem",
    fontWeight: "500",
    cursor: "pointer",
    "&:hover:not(:disabled)": {
      backgroundColor: "#0056b3",
    },
    "&:disabled": {
      backgroundColor: "#6c757d",
      cursor: "not-allowed",
    },
  }),
};