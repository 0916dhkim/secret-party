import { db } from "../db/db";
import { auditLogTable } from "../db/schema";

export type AuditAction =
  | "login_success"
  | "login_failure"
  | "logout"
  | "signup"
  | "secret_view"
  | "secret_create"
  | "secret_update"
  | "secret_delete"
  | "api_secret_list"
  | "api_secret_get"
  | "api_auth_failure"
  | "api_access_denied"
  | "project_create"
  | "project_delete"
  | "environment_create"
  | "environment_delete"
  | "api_client_create"
  | "api_client_delete"
  | "environment_access_grant"
  | "environment_access_revoke";

export async function logAuditEvent(event: {
  action: AuditAction;
  userId?: number;
  apiClientId?: number;
  details?: unknown;
}): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      action: event.action,
      userId: event.userId,
      apiClientId: event.apiClientId,
      details: event.details ? JSON.stringify(event.details) : null,
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}
