import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyActivity } from "@/lib/stats";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const monthly = await getMonthlyActivity(session.user.id);
    return NextResponse.json({ monthly });
  } catch (error) {
    console.error("Monthly activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
