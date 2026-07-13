import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/request-auth";
import { rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const patchSchema = z.object({
  note: z.string().max(300),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = rateLimitResponse(request, 120, 60 * 1000);
  if (!limit.success && limit.response) return limit.response;

  const userId = await getUserIdFromRequest(request);
  if (!userId || userId === "expired") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.problemReview.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const updatedReview = await prisma.problemReview.update({
      where: { id },
      data: {
        note: parsed.data.note === "" ? null : parsed.data.note,
      },
    });

    return NextResponse.json({ review: updatedReview });
  } catch (error) {
    console.error("Patch review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
