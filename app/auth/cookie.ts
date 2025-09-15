import { getCookie, setCookie } from "@tanstack/react-start/server";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export function getSessionCookie(): string | null {
  return getCookie(SESSION_COOKIE_NAME) ?? null;
}

export function setSessionCookie(value: string, maxAge: number) {
  setCookie(SESSION_COOKIE_NAME, value, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge,
  });
}
