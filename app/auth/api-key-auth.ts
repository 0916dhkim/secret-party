import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { apiClientTable, environmentAccessTable } from "../db/schema";

export interface APIKeyAuthResult {
  clientId: number;
  clientName: string;
  hasEnvironmentAccess: (environmentId: number) => Promise<boolean>;
}

/**
 * Authenticate an API request using the public key in the Authorization header
 * Expected header format: "Bearer <base64-encoded-public-key>"
 */
export async function authenticateAPIKey(
  authorizationHeader: string | null
): Promise<APIKeyAuthResult | null> {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const publicKeyBase64 = authorizationHeader.substring(7); // Remove "Bearer "
  
  try {
    // Decode the public key
    const publicKey = Buffer.from(publicKeyBase64, "base64").toString("utf-8");
    
    // Find the API client by public key
    const client = await db.query.apiClientTable.findFirst({
      where: eq(apiClientTable.publicKey, publicKey),
    });

    if (!client) {
      return null;
    }

    return {
      clientId: client.id,
      clientName: client.name,
      hasEnvironmentAccess: async (environmentId: number) => {
        const access = await db.query.environmentAccessTable.findFirst({
          where: eq(environmentAccessTable.environmentId, environmentId),
        });
        return access !== undefined;
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get the DEK for an environment that the API client has access to
 * This returns the DEK wrapped by the client's public key
 */
export async function getEnvironmentDEKForClient(
  clientId: number,
  environmentId: number
): Promise<string | null> {
  const access = await db.query.environmentAccessTable.findFirst({
    where: eq(environmentAccessTable.environmentId, environmentId),
  });

  if (!access || access.clientId !== clientId) {
    return null;
  }

  return access.dekWrappedByClientPublicKey;
}

/**
 * Middleware function for API routes that require authentication
 */
export async function requireAPIAuth(
  request: Request
): Promise<APIKeyAuthResult> {
  const authHeader = request.headers.get("Authorization");
  const authResult = await authenticateAPIKey(authHeader);

  if (!authResult) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return authResult;
}

/**
 * Middleware function for API routes that require environment access
 */
export async function requireEnvironmentAccess(
  request: Request,
  environmentId: number
): Promise<{ auth: APIKeyAuthResult; dekWrapped: string }> {
  const auth = await requireAPIAuth(request);
  
  const hasAccess = await auth.hasEnvironmentAccess(environmentId);
  if (!hasAccess) {
    throw new Response("Forbidden: No access to this environment", { 
      status: 403 
    });
  }

  const dekWrapped = await getEnvironmentDEKForClient(auth.clientId, environmentId);
  if (!dekWrapped) {
    throw new Response("Environment access not properly configured", { 
      status: 500 
    });
  }

  return { auth, dekWrapped };
}