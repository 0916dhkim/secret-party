import { css } from "@flow-css/core/css";
import { useState } from "react";

export interface Environment {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  secretCount: number;
}

export interface EnvironmentSelectorProps {
  environments: Environment[];
  selectedEnvironmentIds: number[];
  onSelectionChange: (environmentIds: number[]) => void;
  mode?: "single" | "multiple";
  placeholder?: string;
  disabled?: boolean;
}

export function EnvironmentSelector({
  environments,
  selectedEnvironmentIds,
  onSelectionChange,
  mode = "multiple",
  placeholder = "Select environments...",
  disabled = false,
}: EnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group environments by project
  const groupedEnvironments = environments.reduce((acc, env) => {
    const projectName = env.projectName;
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(env);
    return acc;
  }, {} as Record<string, Environment[]>);

  const handleEnvironmentToggle = (envId: number) => {
    if (disabled) return;

    if (mode === "single") {
      onSelectionChange([envId]);
      setIsOpen(false);
    } else {
      const newSelection = selectedEnvironmentIds.includes(envId)
        ? selectedEnvironmentIds.filter(id => id !== envId)
        : [...selectedEnvironmentIds, envId];
      onSelectionChange(newSelection);
    }
  };

  const getSelectedEnvironmentsText = () => {
    if (selectedEnvironmentIds.length === 0) {
      return placeholder;
    }

    if (mode === "single") {
      const selectedEnv = environments.find(e => e.id === selectedEnvironmentIds[0]);
      return selectedEnv ? `${selectedEnv.projectName} / ${selectedEnv.name}` : placeholder;
    }

    if (selectedEnvironmentIds.length === 1) {
      const selectedEnv = environments.find(e => e.id === selectedEnvironmentIds[0]);
      return selectedEnv ? `${selectedEnv.projectName} / ${selectedEnv.name}` : placeholder;
    }

    return `${selectedEnvironmentIds.length} environments selected`;
  };

  return (
    <div className={styles.container}>
      <div 
        className={`${styles.selector} ${disabled ? styles.selectorDisabled : ""} ${isOpen ? styles.selectorOpen : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={styles.selectedText}>
          {getSelectedEnvironmentsText()}
        </span>
        <span className={styles.arrow}>
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {isOpen && !disabled && (
        <div className={styles.dropdown}>
          {Object.keys(groupedEnvironments).length === 0 ? (
            <div className={styles.emptyState}>
              No environments available
            </div>
          ) : (
            Object.entries(groupedEnvironments).map(([projectName, projectEnvs]) => (
              <div key={projectName} className={styles.projectGroup}>
                <div className={styles.projectHeader}>
                  {projectName}
                </div>
                {projectEnvs.map((env) => (
                  <div 
                    key={env.id} 
                    className={styles.environmentOption}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnvironmentToggle(env.id);
                    }}
                  >
                    <div className={styles.environmentInfo}>
                      {mode === "multiple" && (
                        <input
                          type="checkbox"
                          checked={selectedEnvironmentIds.includes(env.id)}
                          onChange={() => {}} // Handled by onClick
                          className={styles.checkbox}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {mode === "single" && (
                        <input
                          type="radio"
                          checked={selectedEnvironmentIds.includes(env.id)}
                          onChange={() => {}} // Handled by onClick
                          className={styles.radio}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className={styles.environmentDetails}>
                        <span className={styles.environmentName}>
                          {env.name}
                        </span>
                        <span className={styles.environmentStats}>
                          {env.secretCount} secret{env.secretCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: css({
    position: "relative",
    width: "100%",
  }),

  selector: css({
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    backgroundColor: "white",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "1rem",
    "&:hover": {
      borderColor: "#adb5bd",
    },
  }),

  selectorDisabled: css({
    backgroundColor: "#f8f9fa",
    cursor: "not-allowed",
    color: "#6c757d",
    "&:hover": {
      borderColor: "#ced4da",
    },
  }),

  selectorOpen: css({
    borderColor: "#007bff",
    boxShadow: "0 0 0 2px rgba(0, 123, 255, 0.25)",
  }),

  selectedText: css({
    flex: 1,
    textAlign: "left",
    color: "#495057",
  }),

  arrow: css({
    fontSize: "0.8rem",
    color: "#6c757d",
  }),

  dropdown: css({
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    border: "1px solid #ced4da",
    borderTop: "none",
    borderRadius: "0 0 4px 4px",
    maxHeight: "300px",
    overflowY: "auto",
    zIndex: 1000,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  }),

  emptyState: css({
    padding: "1rem",
    textAlign: "center",
    color: "#6c757d",
    fontSize: "0.9rem",
  }),

  projectGroup: css({
    borderBottom: "1px solid #e9ecef",
    "&:last-child": {
      borderBottom: "none",
    },
  }),

  projectHeader: css({
    padding: "0.75rem",
    backgroundColor: "#f8f9fa",
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "#495057",
    borderBottom: "1px solid #e9ecef",
  }),

  environmentOption: css({
    padding: "0.75rem",
    cursor: "pointer",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#f8f9fa",
    },
  }),

  environmentInfo: css({
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  }),

  checkbox: css({
    margin: 0,
    cursor: "pointer",
  }),

  radio: css({
    margin: 0,
    cursor: "pointer",
  }),

  environmentDetails: css({
    flex: 1,
  }),

  environmentName: css({
    display: "block",
    fontWeight: "500",
    color: "#495057",
  }),

  environmentStats: css({
    display: "block",
    fontSize: "0.8rem",
    color: "#6c757d",
    marginTop: "0.25rem",
  }),
};