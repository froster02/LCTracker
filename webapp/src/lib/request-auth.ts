import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/api-keys";
import crypto from "crypto";

// Resolves the requesting user from either the extension's x-api-key header
// or the dashboard session cookie. Same semantics as the inline helper in
// api/submissions/route.ts.
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const valid = await validateApiKey(keyHash);
    if (valid) return valid.userId;
  }

  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {
    // auth() may throw if no session
  }

  return null;
}
