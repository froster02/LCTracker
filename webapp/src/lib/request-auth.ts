import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/api-keys";
import crypto from "crypto";

// Resolves the requesting user from x-api-key header or session cookie.
// Returns "expired" when the API key exists but is expired/revoked (so routes
// can return a distinct 401 body that the extension uses to trigger re-auth).
export async function getUserIdFromRequest(
  request: Request
): Promise<string | "expired" | null> {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const result = await validateApiKey(keyHash);
    if (result === "expired") return "expired";
    if (result) return result.userId;
  }

  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {
    // auth() may throw if no session
  }

  return null;
}
