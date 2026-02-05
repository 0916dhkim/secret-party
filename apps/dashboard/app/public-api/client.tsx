import { hc } from "hono/client";
import type { publicApiServer } from "./server";

export function createPublicApiClient(
  baseUrl: string,
  options?: {
    headers?: Record<string, string>;
    fetch?: typeof fetch;
  },
) {
  return hc<typeof publicApiServer>(baseUrl, options);
}
