import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const VALID_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED"] as const;
type GoalSheetStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(status: string): status is GoalSheetStatus {
  return (VALID_STATUSES as readonly string[]).includes(status);
}

// PATCH /api/goal-sheets/[id]/status - Update goal sheet status (admin/manager only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can change status via this endpoint
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return Response.json(
        { error: "Forbidden: Only managers and admins can update goal sheet status" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const { status } = body as { status: string };

    if (!status || !isValidStatus(status)) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, managerId: true } },
      },
    });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    // Managers can only update sheets of their direct reports
    if (
      session.user.role === "MANAGER" &&
      sheet.employee.managerId !== session.user.id
    ) {
      return Response.json(
        { error: "Forbidden: You are not this employee's manager" },
        { status: 403 }
      );
    }

    const previousStatus = sheet.status;

    const updateData: Record<string, unknown> = { status };

    // Set approval fields when transitioning to APPROVED
    if (status === "APPROVED") {
      updateData.approvedAt = new Date();
      updateData.approvedById = session.user.id;
    }

    // Clear approval fields when moving away from APPROVED
    if (previousStatus === "APPROVED" && status !== "APPROVED") {
      updateData.approvedAt = null;
      updateData.approvedById = null;
    }

    const updatedSheet = await prisma.goalSheet.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { id: true, name: true, email: true, department: true },
        },
        cycle: { select: { id: true, name: true, status: true } },
        goals: { select: { id: true, title: true, weightage: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    await createAuditLog(
      session.user.id,
      "UPDATE_STATUS",
      "GoalSheet",
      id,
      { status: previousStatus },
      { status }
    );

    return Response.json(updatedSheet);
  } catch (error) {
    console.error("PATCH /api/goal-sheets/[id]/status error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
