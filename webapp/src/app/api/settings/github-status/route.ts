import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { githubLogin: true, githubAccessToken: true },
  });

  return NextResponse.json({
    githubLogin: user?.githubLogin ?? null,
    repoSyncEnabled: Boolean(user?.githubLogin && user?.githubAccessToken),
  });
}
