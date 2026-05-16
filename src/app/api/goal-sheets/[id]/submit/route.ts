import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { validateGoals } from "@/lib/validation";

// POST /api/goal-sheets/[id]/submit - Submit goal sheet for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      include: {
        goals: true,
        employee: { select: { id: true, name: true, managerId: true } },
      },
    });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    // Only the owner can submit
    if (sheet.employeeId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Must be in DRAFT or RETURNED status
    if (sheet.status !== "DRAFT" && sheet.status !== "RETURNED") {
      return Response.json(
        { error: "Goal sheet can only be submitted from DRAFT or RETURNED status" },
        { status: 400 }
      );
    }

    // Validate goals before submission
    const goalInputs = sheet.goals.map((g) => ({
      thrustArea: g.thrustArea,
      title: g.title,
      description: g.description || undefined,
      uomType: g.uomType,
      target: g.target,
      weightage: g.weightage,
    }));

    const errors = validateGoals(goalInputs);
    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const updatedSheet = await prisma.goalSheet.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        returnComment: null,
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        cycle: { select: { id: true, name: true } },
        goals: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Create notification for manager if one exists
    if (sheet.employee.managerId) {
      await prisma.notification.create({
        data: {
          userId: sheet.employee.managerId,
          type: "GOAL_SUBMITTED",
          title: "Goal Sheet Submitted for Approval",
          message: `${sheet.employee.name} has submitted their goal sheet for your approval.`,
          link: `/goal-sheets/${id}`,
        },
      });
    }

    await createAuditLog(
      session.user.id,
      "SUBMIT",
      "GoalSheet",
      id,
      { status: sheet.status },
      { status: "SUBMITTED" }
    );

    return Response.json(updatedSheet);
  } catch (error) {
    console.error("POST /api/goal-sheets/[id]/submit error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
