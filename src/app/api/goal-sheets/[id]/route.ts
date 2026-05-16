import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { validateGoals, GoalInput } from "@/lib/validation";

// GET /api/goal-sheets/[id] - Get a single goal sheet with goals
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

    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, email: true, department: true, managerId: true } },
        cycle: true,
        approvedBy: { select: { id: true, name: true } },
        goals: {
          orderBy: { sortOrder: "asc" },
          include: {
            achievements: true,
            sharedFrom: { select: { id: true, title: true } },
          },
        },
        checkIns: {
          include: {
            manager: { select: { id: true, name: true } },
          },
        },
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

    return Response.json(sheet);
  } catch (error) {
    console.error("GET /api/goal-sheets/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/goal-sheets/[id] - Update goals in a goal sheet
export async function PUT(
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
      include: { goals: true, cycle: true },
    });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    // Only owner can edit, and only in DRAFT or RETURNED status
    if (sheet.employeeId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sheet.status !== "DRAFT" && sheet.status !== "RETURNED") {
      return Response.json(
        { error: "Goal sheet can only be edited in DRAFT or RETURNED status" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { goals } = body as { goals: (GoalInput & { id?: string; sortOrder?: number; isShared?: boolean; sharedFromGoalId?: string; titleReadOnly?: boolean; targetReadOnly?: boolean })[] };

    if (!goals || !Array.isArray(goals)) {
      return Response.json({ error: "goals array is required" }, { status: 400 });
    }

    // Validate goals
    const errors = validateGoals(goals);
    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const previousGoals = sheet.goals;

    // Replace all goals in a transaction
    const updatedSheet = await prisma.$transaction(async (tx) => {
      // Delete existing goals
      await tx.goal.deleteMany({ where: { goalSheetId: id } });

      // Create new goals
      for (let i = 0; i < goals.length; i++) {
        const goal = goals[i];
        await tx.goal.create({
          data: {
            goalSheetId: id,
            sortOrder: goal.sortOrder ?? i,
            thrustArea: goal.thrustArea,
            title: goal.title,
            description: goal.description || null,
            uomType: goal.uomType,
            target: goal.target,
            weightage: goal.weightage,
            isShared: goal.isShared || false,
            sharedFromGoalId: goal.sharedFromGoalId || null,
            titleReadOnly: goal.titleReadOnly || false,
            targetReadOnly: goal.targetReadOnly || false,
          },
        });
      }

      // If sheet was RETURNED, move back to DRAFT
      if (sheet.status === "RETURNED") {
        await tx.goalSheet.update({
          where: { id },
          data: { status: "DRAFT", returnComment: null },
        });
      }

      return tx.goalSheet.findUnique({
        where: { id },
        include: {
          goals: { orderBy: { sortOrder: "asc" } },
          employee: { select: { id: true, name: true, email: true } },
          cycle: { select: { id: true, name: true } },
        },
      });
    });

    await createAuditLog(session.user.id, "UPDATE_GOALS", "GoalSheet", id, previousGoals, goals);

    return Response.json(updatedSheet);
  } catch (error) {
    console.error("PUT /api/goal-sheets/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/goal-sheets/[id] - Delete a goal sheet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const sheet = await prisma.goalSheet.findUnique({ where: { id } });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    // Only owner or admin can delete, and only in DRAFT status
    const isOwner = sheet.employeeId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sheet.status !== "DRAFT") {
      return Response.json(
        { error: "Only DRAFT goal sheets can be deleted" },
        { status: 400 }
      );
    }

    await prisma.goalSheet.delete({ where: { id } });

    await createAuditLog(session.user.id, "DELETE", "GoalSheet", id, sheet, null);

    return Response.json({ message: "Goal sheet deleted" });
  } catch (error) {
    console.error("DELETE /api/goal-sheets/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
