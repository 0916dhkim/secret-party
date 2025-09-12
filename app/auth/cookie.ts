import cookie from "cookie";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export function parseSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader == null) {
    return null;
  }
  const cookies = cookie.parse(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export function serializeSessionCookie(value: string, maxAge: number) {
  return cookie.serialize(SESSION_COOKIE_NAME, value, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge,
  });
}
