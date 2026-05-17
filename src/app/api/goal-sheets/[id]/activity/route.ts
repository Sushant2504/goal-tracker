import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/goal-sheets/[id]/activity - Get audit log entries for a goal sheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify goal sheet exists
    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        employee: { select: { managerId: true } },
      },
    });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    // Authorization: owner, their manager, or admin
    const isOwner = sheet.employeeId === session.user.id;
    const isManager = sheet.employee.managerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isManager && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await prisma.auditLog.findMany({
      where: {
        entityType: "GoalSheet",
        entityId: id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return Response.json(activities);
  } catch (error) {
    console.error("GET /api/goal-sheets/[id]/activity error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
