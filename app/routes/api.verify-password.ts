import { createFileRoute } from "@tanstack/react-router"
import { createAPIFileRoute } from "@tanstack/react-start";
import { verifyUserPassword } from "../auth/password-verification";
import { getSession } from "../auth/session";
import { logSecurityEvent } from "../api/audit-logger";
import { z } from "zod";

const verifyPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const Route = createAPIFileRoute("/api/verify-password")({
  POST: async ({ request }) => {
    try {
      // Check if user is authenticated
      const session = await getSession();
      if (!session) {
        logSecurityEvent({
          action: "password_verification_unauthenticated",
          success: false,
          errorMessage: "No active session",
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        });
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse request body
      const body = await request.json();
      const { password } = verifyPasswordSchema.parse(body);

      // Verify password
      const isValid = await verifyUserPassword(password);

      // Log the attempt
      logSecurityEvent({
        userId: session.user.id,
        userEmail: session.user.email,
        action: "password_verification",
        success: isValid,
        errorMessage: isValid ? undefined : "Invalid password",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });

      return new Response(JSON.stringify({ valid: isValid }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error: any) {
      console.error("Password verification error:", error);

      // Log the error
      const session = await getSession();
      logSecurityEvent({
        userId: session?.user.id,
        userEmail: session?.user.email,
        action: "password_verification_error",
        success: false,
        errorMessage: error.message || "Unknown error",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });

      return new Response(JSON.stringify({ valid: false, error: "Verification failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});