import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-keys";
import { rateLimitResponse } from "@/lib/rate-limit";

// Verify Google ID token manually without needing googleapis
async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name?: string;
  picture?: string;
} | null> {
  // Local development bypass
  if (idToken === "dev-bypass-token") {
    return {
      sub: "dev-google-id-12345",
      email: "arushnaudiyal@gmail.com",
      name: "Arush Naudiyal (Dev Mode)",
      picture: "https://lh3.googleusercontent.com/a/default-user-icon",
    };
  }

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return null;
    const payload = await res.json();

    // Validate audience
    const clientId = process.env.AUTH_GOOGLE_ID;
    if (clientId && payload.aud !== clientId) return null;

    // Check token not expired
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    if (!payload.email || !payload.sub) return null;

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const limit = rateLimitResponse(request, 10, 60 * 1000);
  if (!limit.success && limit.response) return limit.response;

  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const googleUser = await verifyGoogleIdToken(idToken);
    if (!googleUser) {
      return NextResponse.json(
        { error: "Invalid Google ID token" },
        { status: 401 }
      );
    }

    const user = await prisma.user.upsert({
      where: { email: googleUser.email },
      update: {
        name: googleUser.name,
        image: googleUser.picture,
        googleId: googleUser.sub,
      },
      create: {
        email: googleUser.email,
        name: googleUser.name,
        image: googleUser.picture,
        googleId: googleUser.sub,
      },
    });

    // Ensure stats exist
    await prisma.userStat.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    // Revoke existing extension keys to avoid buildup
    await prisma.apiKey.updateMany({
      where: { userId: user.id, name: "Chrome Extension" },
      data: { revoked: true },
    });

    const apiKey = await createApiKey(user.id, "Chrome Extension");

    return NextResponse.json({ apiKey, userId: user.id });
  } catch (error) {
    console.error("Extension auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
