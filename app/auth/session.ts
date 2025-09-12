import { eq, lt, sql } from "drizzle-orm";
import { db } from "../db/db";
import { sessionTable, userTable } from "../db/schema";
import { generateSessionToken } from "./hash";
import { parseSessionCookie } from "./cookie";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hasFirstUser() {
  const userCount = await db.$count(userTable);
  return userCount > 0;
}

export async function createSession(userId: number) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await db
    .insert(sessionTable)
    .values({
      userId,
      token,
      expiresAt,
    })
    .returning();

  if (!session) {
    throw new Error("Failed to create session");
  }

  return session;
}

export async function invalidateSession(token: string) {
  await db.delete(sessionTable).where(eq(sessionTable.token, token));
}

export async function deleteExpiredSessions(): Promise<void> {
  await db.delete(sessionTable).where(lt(sessionTable.expiresAt, sql`NOW()`));
}

export async function getSessionFromRequest(request: Request) {
  const token = parseSessionCookie(request);

  if (token == null) {
    return null;
  }

  return findValidSessionByToken(token);
}

/**
 * Utility for protected routes - throws redirect response if not authenticated
 */
export async function requireAuth(
  request: Request,
  redirectTo: string = "/login"
) {
  const session = await getSessionFromRequest(request);

  if (session == null) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  }

  return session;
}

async function findValidSessionByToken(token: string) {
  const result = await db.query.sessionTable.findFirst({
    where: eq(sessionTable.token, token),
    with: { user: true },
  });

  if (!result || result.expiresAt < new Date()) {
    return null;
  }

  return result;
}

/**
 * Utility function to periodically clean up expired sessions.
 * Call this in a cron job or periodic task.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const deletedSessions = await db
    .delete(sessionTable)
    .where(lt(sessionTable.expiresAt, sql`NOW()`))
    .returning();
  return deletedSessions.length;
}
