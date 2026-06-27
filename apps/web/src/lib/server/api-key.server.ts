import { auth } from "./auth.server";

/**
 * Verify the API key carried by a request's headers.
 */
export async function verifyRequestApiKey(request: Request): Promise<boolean> {
  const header =
    request.headers.get("Authorization") || request.headers.get("x-api-key");
  const key = header?.replace(/^Bearer\s+/i, "").trim();
  if (!key) {
    return false;
  }

  const { valid } = await auth.api.verifyApiKey({ body: { key } });
  return valid;
}
