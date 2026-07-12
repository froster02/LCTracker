import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-keys";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimitResponse(request, 10, 60 * 1000);
  if (!limit.success && limit.response) return limit.response;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.apiKey.updateMany({
      where: { userId: user.id, name: "Chrome Extension" },
      data: { revoked: true },
    });

    const apiKey = await createApiKey(user.id, "Chrome Extension");

    return NextResponse.json({ apiKey, userId: user.id });
  } catch (error) {
    console.error("Extension session auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
