import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createApiKey, validateApiKey } from "@/lib/api-keys";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Missing apiKey" }, { status: 400 });
    }

    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const valid = await validateApiKey(keyHash);
    if (!valid || valid === "expired") {
      return NextResponse.json({ error: "api_key_expired" }, { status: 401 });
    }

    // Revoke old key
    await prisma.apiKey.updateMany({
      where: { userId: valid.userId, name: "Chrome Extension" },
      data: { revoked: true },
    });

    // Create new key
    const newKey = await createApiKey(valid.userId, "Chrome Extension");

    return NextResponse.json({ apiKey: newKey });
  } catch (error) {
    console.error("Extension refresh error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
