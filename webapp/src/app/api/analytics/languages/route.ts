import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLanguageDistribution } from "@/lib/stats";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const distribution = await getLanguageDistribution(session.user.id);
    return NextResponse.json({ languages: distribution });
  } catch (error) {
    console.error("Languages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
