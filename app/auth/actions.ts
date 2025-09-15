import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { userTable } from "../db/schema";
import { verifyPassword, hashPassword } from "./hash";
import {
  createSession,
  getSession,
  hasFirstUser,
  invalidateSession,
} from "./session";
import { setSessionCookie } from "./cookie";
import { loginSchema, signupSchema, parseFormData } from "./validation";
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";

export const login = createServerFn({ method: "POST" })
  .validator((formData) => parseFormData(formData, loginSchema))
  .handler(async ({ data }) => {
    const { email, password } = data;

    // Find user by email
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.email, email),
    });

    if (!user) {
      throw redirect({
        to: "/login",
        search: {
          error: "Invalid email or password",
        },
      });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw redirect({
        to: "/login",
        search: {
          error: "Invalid email or password",
        },
      });
    }

    const session = await createSession(user.id);

    setSessionCookie(
      session.token,
      7 * 24 * 60 * 60 // 7 days
    );
    throw redirect({ to: "/" });
  });

export const signUp = createServerFn({ method: "POST" })
  .validator((formData) => parseFormData(formData, signupSchema))
  .handler(async ({ data }) => {
    const { email, password } = data;

    // Double-check no users exist (race condition protection)
    if (await hasFirstUser()) {
      throw redirect({
        to: "/signup",
        search: {
          error: "Signup is no longer available. Only one user is allowed.",
        },
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [user] = await db
      .insert(userTable)
      .values({
        email,
        passwordHash,
      })
      .returning();

    if (!user) {
      throw redirect({
        to: "/signup",
        search: {
          error: "Failed to create user account",
        },
      });
    }

    const session = await createSession(user.id);
    setSessionCookie(
      session.token,
      7 * 24 * 60 * 60 // 7 days
    );
    throw redirect({ to: "/" });
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  if (session) {
    await invalidateSession(session.token);
  }

  setSessionCookie("", 0); // maxAge 0 clears the cookie
  throw redirect({ to: "/login" });
});
