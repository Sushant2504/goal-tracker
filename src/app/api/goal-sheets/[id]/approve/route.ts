import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// POST /api/goal-sheets/[id]/approve - Manager approves a goal sheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can approve
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden: Only managers can approve goal sheets" }, { status: 403 });
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

    // Only the employee's manager or an admin can approve
    if (session.user.role === "MANAGER" && sheet.employee.managerId !== session.user.id) {
      return Response.json({ error: "Forbidden: You are not this employee's manager" }, { status: 403 });
    }

    // Must be in SUBMITTED status
    if (sheet.status !== "SUBMITTED") {
      return Response.json(
        { error: "Goal sheet must be in SUBMITTED status to approve" },
        { status: 400 }
      );
    }

    const updatedSheet = await prisma.goalSheet.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user.id,
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        cycle: { select: { id: true, name: true } },
        goals: { orderBy: { sortOrder: "asc" } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    // Notify the employee
    await prisma.notification.create({
      data: {
        userId: sheet.employeeId,
        type: "GOAL_APPROVED",
        title: "Goal Sheet Approved",
        message: `Your goal sheet has been approved by ${session.user.name}.`,
        link: `/goal-sheets/${id}`,
      },
    });

    await createAuditLog(
      session.user.id,
      "APPROVE",
      "GoalSheet",
      id,
      { status: "SUBMITTED" },
      { status: "APPROVED", approvedById: session.user.id }
    );

    return Response.json(updatedSheet);
  } catch (error) {
    console.error("POST /api/goal-sheets/[id]/approve error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
