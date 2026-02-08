import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { css } from "@flow-css/core/css";
import { useState } from "react";
import { requireAdmin } from "../auth/session";
import { Layout } from "../components/Layout";
import { Breadcrumb } from "../components/Breadcrumb";
import { mainContent } from "../styles/shared";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createBackup, listBackups, readBackup } from "../backup/backup";
import { restoreFromBackup, validateBackup } from "../backup/restore";
import { logAuditEvent } from "@secret-party/audit/logger";

export const Route = createFileRoute("/admin/backups")({
  component: AdminBackups,
  loader: async () => await loader(),
});

const loader = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await requireAdmin();
  const backups = await listBackups();

  return {
    user: session.user,
    backups: backups.map((b) => ({
      filename: b.filename,
      createdAt: b.createdAt.toISOString(),
      sizeBytes: b.sizeBytes,
    })),
  };
});

const triggerBackup = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await requireAdmin();

  const result = await createBackup();

  await logAuditEvent({
    action: "backup_created",
    userId: session.user.id,
    details: { filename: result.filename },
  });

  return { filename: result.filename };
});

const triggerRestore = createServerFn({
  method: "POST",
})
  .validator((data: { source: "file"; content: string } | { source: "existing"; filename: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireAdmin();

    const fileContent = data.source === "file"
      ? data.content
      : await readBackup(data.filename);

    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      throw new Error("Invalid JSON file");
    }

    if (!validateBackup(parsed)) {
      throw new Error(
        "Invalid backup file format. Check the version and structure."
      );
    }

    // Auto-create a safety backup before restoring
    await createBackup();

    await restoreFromBackup(parsed);

    await logAuditEvent({
      action: "backup_restored",
      userId: session.user.id,
      details: { restoredFrom: parsed.createdAt },
    });

    return { success: true };
  });

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

type RestoreSource =
  | { type: "file" }
  | { type: "existing"; filename: string };

function AdminBackups() {
  const loaderData = Route.useLoaderData();
  const router = useRouter();
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreSource, setRestoreSource] = useState<RestoreSource>({ type: "file" });
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const backupMutation = useMutation({
    mutationFn: () => triggerBackup(),
    onSuccess: () => {
      router.invalidate();
    },
    onError: (error) => {
      alert(`Backup failed: ${error.message}`);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (restoreSource.type === "file") {
        if (!restoreFile) throw new Error("No file selected");
        const content = await restoreFile.text();
        return triggerRestore({ data: { source: "file", content } });
      } else {
        return triggerRestore({ data: { source: "existing", filename: restoreSource.filename } });
      }
    },
    onSuccess: () => {
      setIsRestoreModalOpen(false);
      setRestoreFile(null);
      setRestoreError(null);
      router.invalidate();
    },
    onError: (error) => {
      setRestoreError(error.message);
    },
  });

  const openRestoreFromFile = () => {
    setRestoreSource({ type: "file" });
    setIsRestoreModalOpen(true);
  };

  const openRestoreFromExisting = (filename: string) => {
    setRestoreSource({ type: "existing", filename });
    setIsRestoreModalOpen(true);
  };

  const closeRestoreModal = () => {
    setIsRestoreModalOpen(false);
    setRestoreFile(null);
    setRestoreError(null);
    restoreMutation.reset();
  };

  return (
    <Layout userEmail={loaderData.user.email} isAdmin={!!loaderData.user.isAdmin}>
      <Breadcrumb items={[{ label: "Admin" }, { label: "Backups" }]} />
      <div className={mainContent}>
        <h1 className={css({ fontSize: "2rem", fontWeight: "bold", marginBottom: "2rem" })}>
          Backups
        </h1>

        {/* Actions */}
        <div
          className={css({
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
          })}
        >
          <Button
            variant="primary"
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
          >
            {backupMutation.isPending ? "Creating Backup..." : "Create Backup Now"}
          </Button>
          <Button
            variant="secondary"
            onClick={openRestoreFromFile}
          >
            Restore from File
          </Button>
        </div>

        {backupMutation.isSuccess && (
          <div
            className={css(({ v }) => ({
              padding: "1rem",
              marginBottom: "1.5rem",
              borderRadius: "6px",
              backgroundColor: `oklch(from ${v("--c-success")} l c h / 0.1)`,
              border: `1px solid ${v("--c-success")}`,
              color: v("--c-success"),
              fontSize: "0.875rem",
            }))}
          >
            Backup created successfully: {backupMutation.data?.filename}
          </div>
        )}

        {/* Backup List */}
        <h2
          className={css({
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "1rem",
          })}
        >
          Existing Backups
        </h2>

        {loaderData.backups.length === 0 ? (
          <div
            className={css(({ v }) => ({
              textAlign: "center",
              padding: "2rem",
              color: v("--c-text-muted"),
              fontSize: "1rem",
            }))}
          >
            No backups yet. Create your first backup to get started.
          </div>
        ) : (
          <div
            className={css(({ v }) => ({
              border: `1px solid ${v("--c-border")}`,
              borderRadius: "8px",
              overflow: "hidden",
            }))}
          >
            <table
              className={css(({ v }) => ({
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
                "& th": {
                  textAlign: "left",
                  padding: "0.75rem 1rem",
                  backgroundColor: v("--c-bg-light"),
                  borderBottom: `1px solid ${v("--c-border")}`,
                  fontWeight: "600",
                  color: v("--c-text-muted"),
                },
                "& td": {
                  padding: "0.75rem 1rem",
                  borderBottom: `1px solid ${v("--c-border")}`,
                  color: v("--c-text"),
                },
                "& tr:last-child td": {
                  borderBottom: "none",
                },
              }))}
            >
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Created</th>
                  <th>Size</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loaderData.backups.map((backup) => (
                  <tr key={backup.filename}>
                    <td>
                      <code
                        className={css(({ v }) => ({
                          fontSize: "0.8125rem",
                          backgroundColor: v("--c-bg-light"),
                          padding: "0.125rem 0.375rem",
                          borderRadius: "4px",
                        }))}
                      >
                        {backup.filename}
                      </code>
                    </td>
                    <td>{formatDate(backup.createdAt)}</td>
                    <td>{formatFileSize(backup.sizeBytes)}</td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openRestoreFromExisting(backup.filename)}
                      >
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Restore Modal */}
        <Modal open={isRestoreModalOpen} onClose={closeRestoreModal}>
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
                margin: 0,
              })}
            >
              Restore from Backup
            </h2>

            <div
              className={css(({ v }) => ({
                padding: "1rem",
                borderRadius: "6px",
                backgroundColor: `oklch(from ${v("--c-danger")} l c h / 0.1)`,
                border: `1px solid ${v("--c-danger")}`,
                color: v("--c-danger"),
                fontSize: "0.875rem",
                lineHeight: "1.5",
              }))}
            >
              <strong>Warning:</strong> Restoring from a backup will permanently
              delete all current data and replace it with the backup contents.
              This action cannot be undone.
            </div>

            {restoreSource.type === "file" ? (
              <div
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                })}
              >
                <label
                  className={css(({ v }) => ({
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: v("--c-text"),
                  }))}
                >
                  Select backup file (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    setRestoreFile(e.target.files?.[0] ?? null);
                    setRestoreError(null);
                  }}
                  className={css(({ v }) => ({
                    padding: "0.5rem",
                    border: `1px solid ${v("--c-border")}`,
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    backgroundColor: v("--c-bg-light"),
                    color: v("--c-text"),
                  }))}
                />
              </div>
            ) : (
              <div
                className={css(({ v }) => ({
                  fontSize: "0.875rem",
                  color: v("--c-text"),
                }))}
              >
                Restore from: <code
                  className={css(({ v }) => ({
                    backgroundColor: v("--c-bg-light"),
                    padding: "0.125rem 0.375rem",
                    borderRadius: "4px",
                  }))}
                >{restoreSource.filename}</code>
              </div>
            )}

            {restoreError && (
              <div
                className={css(({ v }) => ({
                  color: v("--c-danger"),
                  fontSize: "0.875rem",
                }))}
              >
                {restoreError}
              </div>
            )}

            <div
              className={css({
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
                marginTop: "0.5rem",
              })}
            >
              <Button
                variant="secondary"
                onClick={closeRestoreModal}
                disabled={restoreMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => restoreMutation.mutate()}
                disabled={(restoreSource.type === "file" && !restoreFile) || restoreMutation.isPending}
              >
                {restoreMutation.isPending
                  ? "Restoring..."
                  : "Restore & Wipe All Data"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
