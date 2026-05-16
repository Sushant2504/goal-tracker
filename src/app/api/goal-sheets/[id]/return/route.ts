import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// POST /api/goal-sheets/[id]/return - Manager returns a goal sheet with comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can return
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden: Only managers can return goal sheets" }, { status: 403 });
    }

    const { id } = await params;

    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, managerId: true } },
      },
    });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    // Only the employee's manager or an admin can return
    if (session.user.role === "MANAGER" && sheet.employee.managerId !== session.user.id) {
      return Response.json({ error: "Forbidden: You are not this employee's manager" }, { status: 403 });
    }

    // Must be in SUBMITTED status
    if (sheet.status !== "SUBMITTED") {
      return Response.json(
        { error: "Goal sheet must be in SUBMITTED status to return" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return Response.json({ error: "A return comment is required" }, { status: 400 });
    }

    const updatedSheet = await prisma.goalSheet.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnComment: comment.trim(),
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        cycle: { select: { id: true, name: true } },
        goals: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Notify the employee
    await prisma.notification.create({
      data: {
        userId: sheet.employeeId,
        type: "GOAL_RETURNED",
        title: "Goal Sheet Returned for Revision",
        message: `Your goal sheet has been returned by ${session.user.name}. Comment: ${comment.trim()}`,
        link: `/goal-sheets/${id}`,
      },
    });

    await createAuditLog(
      session.user.id,
      "RETURN",
      "GoalSheet",
      id,
      { status: "SUBMITTED" },
      { status: "RETURNED", returnComment: comment.trim() }
    );

    return Response.json(updatedSheet);
  } catch (error) {
    console.error("POST /api/goal-sheets/[id]/return error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
