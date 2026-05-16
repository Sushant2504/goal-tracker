import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET /api/admin/shared-goals - List shared goals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const cycleId = searchParams.get("cycleId");

    const where: Record<string, unknown> = { isShared: true };

    if (cycleId) {
      where.goalSheet = { cycleId };
    }

    const sharedGoals = await prisma.goal.findMany({
      where,
      include: {
        goalSheet: {
          select: {
            id: true,
            employee: { select: { id: true, name: true, department: true } },
            cycle: { select: { id: true, name: true } },
          },
        },
        sharedTo: {
          select: {
            id: true,
            goalSheet: {
              select: {
                employee: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(sharedGoals);
  } catch (error) {
    console.error("GET /api/admin/shared-goals error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/shared-goals - Create a shared goal and push to employees
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden: Only admins can create shared goals" }, { status: 403 });
    }

    const body = await request.json();
    const {
      cycleId,
      thrustArea,
      title,
      description,
      uomType,
      target,
      weightage,
      employeeIds,
      titleReadOnly = true,
      targetReadOnly = true,
    } = body;

    if (!cycleId || !thrustArea || !title || !uomType || !target || !weightage) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return Response.json({ error: "employeeIds array is required" }, { status: 400 });
    }

    // Verify cycle exists
    const cycle = await prisma.goalCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      return Response.json({ error: "Goal cycle not found" }, { status: 404 });
    }

    // Verify all employees exist
    const employees = await prisma.user.findMany({
      where: { id: { in: employeeIds } },
    });
    if (employees.length !== employeeIds.length) {
      return Response.json({ error: "One or more employees not found" }, { status: 404 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const createdGoals = [];

      for (const employeeId of employeeIds) {
        // Get or create goal sheet for this employee and cycle
        let sheet = await tx.goalSheet.findUnique({
          where: { employeeId_cycleId: { employeeId, cycleId } },
        });

        if (!sheet) {
          sheet = await tx.goalSheet.create({
            data: { employeeId, cycleId },
          });
        }

        // Check if this shared goal was already pushed to this sheet
        // (by looking for same title and same thrust area)
        const existingGoal = await tx.goal.findFirst({
          where: {
            goalSheetId: sheet.id,
            title,
            isShared: true,
          },
        });

        if (existingGoal) {
          createdGoals.push(existingGoal);
          continue;
        }

        // Get the next sort order
        const maxSort = await tx.goal.findFirst({
          where: { goalSheetId: sheet.id },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });

        const goal = await tx.goal.create({
          data: {
            goalSheetId: sheet.id,
            sortOrder: (maxSort?.sortOrder ?? -1) + 1,
            thrustArea,
            title,
            description: description || null,
            uomType,
            target,
            weightage,
            isShared: true,
            titleReadOnly,
            targetReadOnly,
          },
        });

        createdGoals.push(goal);

        // Notify the employee
        await tx.notification.create({
          data: {
            userId: employeeId,
            type: "SHARED_GOAL_ASSIGNED",
            title: "New Shared Goal Assigned",
            message: `A shared goal "${title}" has been added to your goal sheet.`,
            link: `/goal-sheets/${sheet.id}`,
          },
        });
      }

      // Now link sharedFromGoalId: use the first created goal as the "source"
      if (createdGoals.length > 1) {
        const sourceGoalId = createdGoals[0].id;
        for (let i = 1; i < createdGoals.length; i++) {
          await tx.goal.update({
            where: { id: createdGoals[i].id },
            data: { sharedFromGoalId: sourceGoalId },
          });
        }
      }

      return createdGoals;
    });

    await createAuditLog(
      session.user.id,
      "CREATE_SHARED_GOAL",
      "Goal",
      results[0]?.id || "batch",
      null,
      { title, employeeIds, cycleId }
    );

    return Response.json({ goals: results, count: results.length }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/shared-goals error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
