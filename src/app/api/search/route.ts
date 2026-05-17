import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q");
    if (!q || q.trim().length === 0) {
      return Response.json({ employees: [], goals: [], cycles: [] });
    }

    const query = q.trim();

    const [employees, goals, cycles] = await Promise.all([
      prisma.user.findMany({
        where: { name: { contains: query } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
        },
        take: 10,
      }),
      prisma.goal.findMany({
        where: { title: { contains: query } },
        select: {
          id: true,
          title: true,
          thrustArea: true,
          goalSheetId: true,
        },
        take: 10,
      }),
      prisma.goalCycle.findMany({
        where: { name: { contains: query } },
        select: {
          id: true,
          name: true,
          status: true,
        },
        take: 10,
      }),
    ]);

    return Response.json({ employees, goals, cycles });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
