import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const API_KEY_PREFIX = "lcg_";

export function generateApiKey(): { rawKey: string; keyHash: string } {
  const rawKey = API_KEY_PREFIX + crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, keyHash };
}

export async function validateApiKey(
  keyHash: string
): Promise<{ userId: string; apiKeyId: string } | "expired" | null> {
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey) return null;
  if (apiKey.revoked || (apiKey.expiresAt && apiKey.expiresAt < new Date())) return "expired";

  // Update last used (fire-and-forget to avoid blocking the request)
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { userId: apiKey.userId, apiKeyId: apiKey.id };
}

export async function createApiKey(userId: string, name: string = "Chrome Extension"): Promise<string> {
  const { rawKey, keyHash } = generateApiKey();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await prisma.apiKey.create({
    data: {
      userId,
      keyHash,
      name,
      expiresAt,
    },
  });

  return rawKey;
}

export async function revokeApiKey(apiKeyId: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revoked: true },
  });
}

export async function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId, revoked: false },
    orderBy: { createdAt: "desc" },
  });
}
