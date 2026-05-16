import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/goals - List goals, used for shared goals lookup
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const goalSheetId = searchParams.get("goalSheetId");
    const shared = searchParams.get("shared"); // "true" to filter shared goals
    const cycleId = searchParams.get("cycleId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (goalSheetId) {
      where.goalSheetId = goalSheetId;
    }

    if (shared === "true") {
      where.isShared = true;
    }

    if (cycleId) {
      where.goalSheet = { cycleId };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { thrustArea: { contains: search } },
      ];
    }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        goalSheet: {
          select: {
            id: true,
            status: true,
            employee: { select: { id: true, name: true, department: true } },
            cycle: { select: { id: true, name: true } },
          },
        },
        achievements: true,
        sharedFrom: { select: { id: true, title: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return Response.json(goals);
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
