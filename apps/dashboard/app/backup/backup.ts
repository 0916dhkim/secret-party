import { db } from "@secret-party/database/db";
import {
  userTable,
  projectTable,
  environmentTable,
  secretTable,
  apiClientTable,
  environmentAccessTable,
  auditLogTable,
} from "@secret-party/database/schema";
import { writeFile, readFile, readdir, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const BACKUP_VERSION = 1;

function getBackupDir(): string {
  return process.env.BACKUP_DIR || "./backups";
}

export interface BackupData {
  version: number;
  createdAt: string;
  tables: {
    user: (typeof userTable.$inferSelect)[];
    project: (typeof projectTable.$inferSelect)[];
    environment: (typeof environmentTable.$inferSelect)[];
    secret: (typeof secretTable.$inferSelect)[];
    api_client: (typeof apiClientTable.$inferSelect)[];
    environment_access: (typeof environmentAccessTable.$inferSelect)[];
    audit_log: (typeof auditLogTable.$inferSelect)[];
  };
}

export async function createBackup(): Promise<{
  filename: string;
  path: string;
}> {
  const backupDir = getBackupDir();

  if (!existsSync(backupDir)) {
    await mkdir(backupDir, { recursive: true });
  }

  const [users, projects, environments, secrets, apiClients, envAccess, auditLogs] =
    await Promise.all([
      db.select().from(userTable),
      db.select().from(projectTable),
      db.select().from(environmentTable),
      db.select().from(secretTable),
      db.select().from(apiClientTable),
      db.select().from(environmentAccessTable),
      db.select().from(auditLogTable),
    ]);

  const backup: BackupData = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    tables: {
      user: users,
      project: projects,
      environment: environments,
      secret: secrets,
      api_client: apiClients,
      environment_access: envAccess,
      audit_log: auditLogs,
    },
  };

  const filename = `backup-${new Date().toISOString()}.json`;
  const filepath = join(backupDir, filename);

  await writeFile(filepath, JSON.stringify(backup, null, 2), "utf-8");

  return { filename, path: filepath };
}

export async function readBackup(filename: string): Promise<string> {
  // Validate filename to prevent path traversal
  if (filename.includes("/") || filename.includes("\\") || !filename.startsWith("backup-")) {
    throw new Error("Invalid backup filename");
  }

  const filepath = join(getBackupDir(), filename);
  return readFile(filepath, "utf-8");
}

export interface BackupInfo {
  filename: string;
  createdAt: Date;
  sizeBytes: number;
}

export async function listBackups(): Promise<BackupInfo[]> {
  const backupDir = getBackupDir();

  if (!existsSync(backupDir)) {
    return [];
  }

  const files = await readdir(backupDir);
  const backupFiles = files.filter(
    (f) => f.startsWith("backup-") && f.endsWith(".json")
  );

  const backups = await Promise.all(
    backupFiles.map(async (filename) => {
      const filepath = join(backupDir, filename);
      const stats = await stat(filepath);
      return {
        filename,
        createdAt: stats.mtime,
        sizeBytes: stats.size,
      };
    })
  );

  // Sort newest first
  backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return backups;
}
