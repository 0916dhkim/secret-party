import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { userTable } from "../db/schema";
import { verifyPassword, hashPassword } from "./hash";
import {
  createSession,
  getSessionFromRequest,
  hasFirstUser,
  invalidateSession,
} from "./session";
import { serializeSessionCookie } from "./cookie";
import { loginSchema, signupSchema, parseFormData } from "./validation";

export async function login(formData: FormData) {
  const validationResult = parseFormData(formData, loginSchema);

  if (!validationResult.success) {
    return {
      error: "Please check your input and try again.",
    };
  }

  const { email, password } = validationResult.data;

  // Find user by email
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.email, email),
  });

  if (!user) {
    return {
      error: "Invalid email or password",
    };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return {
      error: "Invalid email or password",
    };
  }

  const session = await createSession(user.id);

  throw new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": serializeSessionCookie(session.token, 7 * 24 * 60 * 60), // 7 days
    },
  });
}

export async function signUp(formData: FormData) {
  const validationResult = parseFormData(formData, signupSchema);

  if (!validationResult.success) {
    return {
      error: "Please check your input and try again.",
    };
  }

  const { email, password } = validationResult.data;

  // Double-check no users exist (race condition protection)
  if (await hasFirstUser()) {
    return {
      error: "Signup is no longer available. Only one user is allowed.",
    };
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
    return {
      error: "Failed to create user account",
    };
  }

  const session = await createSession(user.id);

  throw new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": serializeSessionCookie(session.token, 7 * 24 * 60 * 60),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSessionFromRequest(request);
  if (session) {
    await invalidateSession(session.token);
  }

  throw new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": serializeSessionCookie("", 0), // maxAge 0 clears the cookie
    },
  });
}
