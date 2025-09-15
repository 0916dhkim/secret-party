import { css } from "@flow-css/core/css";
import { useState, useRef, useEffect } from "react";

export interface PasswordConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void | Promise<void>;
  title?: string;
  description?: string;
}

export function PasswordConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Password",
  description = "Please enter your password to continue with this sensitive operation.",
}: PasswordConfirmationModalProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      // Focus the password input when modal opens
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    } else {
      dialog.close();
      // Reset form when closing
      setPassword("");
      setError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm(password);
      onClose();
    } catch (error: any) {
      setError(error.message || "Invalid password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Close modal if clicking on backdrop (outside the modal content)
    const dialogRect = e.currentTarget.getBoundingClientRect();
    const isClickOnBackdrop =
      e.clientX < dialogRect.left ||
      e.clientX > dialogRect.right ||
      e.clientY < dialogRect.top ||
      e.clientY > dialogRect.bottom;

    if (isClickOnBackdrop) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.description}>{description}</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                ref={passwordInputRef}
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
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
                className={styles.confirmButton}
                disabled={!password.trim() || isSubmitting}
              >
                {isSubmitting ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}

const styles = {
  dialog: css({
    border: "none",
    borderRadius: "8px",
    padding: 0,
    maxWidth: "400px",
    width: "90vw",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    backgroundColor: "white",
    "::backdrop": {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
  }),

  content: css({
    padding: 0,
  }),

  header: css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    borderBottom: "1px solid #e9ecef",
  }),

  title: css({
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#212529",
  }),

  closeButton: css({
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.25rem",
    lineHeight: 1,
    color: "#6c757d",
    "&:hover": {
      color: "#495057",
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  }),

  body: css({
    padding: "1.5rem",
  }),

  description: css({
    margin: "0 0 1.5rem 0",
    color: "#6c757d",
    lineHeight: 1.5,
  }),

  form: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  }),

  inputGroup: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),

  label: css({
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
    margin: "0.5rem 0 0 0",
  }),

  actions: css({
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    marginTop: "1rem",
  }),

  cancelButton: css({
    padding: "0.75rem 1.5rem",
    border: "1px solid #6c757d",
    borderRadius: "4px",
    backgroundColor: "white",
    color: "#6c757d",
    cursor: "pointer",
    fontSize: "1rem",
    "&:hover": {
      backgroundColor: "#f8f9fa",
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  }),

  confirmButton: css({
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "4px",
    backgroundColor: "#dc3545",
    color: "white",
    cursor: "pointer",
    fontSize: "1rem",
    "&:hover:not(:disabled)": {
      backgroundColor: "#c82333",
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
      backgroundColor: "#6c757d",
    },
  }),
};