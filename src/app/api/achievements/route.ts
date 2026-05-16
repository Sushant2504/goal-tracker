import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { computeScore } from "@/lib/scoring";

// GET /api/achievements - Get achievements for a goal sheet
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const goalSheetId = searchParams.get("goalSheetId");
    const quarter = searchParams.get("quarter");

    if (!goalSheetId) {
      return Response.json({ error: "goalSheetId is required" }, { status: 400 });
    }

    // Verify access to the goal sheet
    const sheet = await prisma.goalSheet.findUnique({
      where: { id: goalSheetId },
      include: {
        employee: { select: { id: true, managerId: true } },
      },
    });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    const isOwner = sheet.employeeId === session.user.id;
    const isManager = sheet.employee.managerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isManager && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      goal: { goalSheetId },
    };
    if (quarter) {
      where.quarter = quarter;
    }

    const achievements = await prisma.quarterlyAchievement.findMany({
      where,
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            thrustArea: true,
            uomType: true,
            target: true,
            weightage: true,
          },
        },
        updatedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ goal: { sortOrder: "asc" } }, { quarter: "asc" }],
    });

    return Response.json(achievements);
  } catch (error) {
    console.error("GET /api/achievements error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/achievements - Save quarterly achievements
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { achievements } = body as {
      achievements: {
        goalId: string;
        quarter: string;
        actualValue: string | null;
        status: string;
      }[];
    };

    if (!achievements || !Array.isArray(achievements) || achievements.length === 0) {
      return Response.json({ error: "achievements array is required" }, { status: 400 });
    }

    // Validate quarter values
    const validQuarters = ["Q1", "Q2", "Q3", "Q4"];
    for (const ach of achievements) {
      if (!validQuarters.includes(ach.quarter)) {
        return Response.json({ error: `Invalid quarter: ${ach.quarter}` }, { status: 400 });
      }
    }

    // Get all referenced goals and verify access
    const goalIds = [...new Set(achievements.map((a) => a.goalId))];
    const goals = await prisma.goal.findMany({
      where: { id: { in: goalIds } },
      include: {
        goalSheet: {
          include: {
            employee: { select: { id: true, managerId: true } },
            cycle: true,
          },
        },
      },
    });

    if (goals.length !== goalIds.length) {
      return Response.json({ error: "One or more goals not found" }, { status: 404 });
    }

    // All goals must belong to the same goal sheet
    const sheetIds = new Set(goals.map((g) => g.goalSheetId));
    if (sheetIds.size !== 1) {
      return Response.json({ error: "All achievements must belong to goals in the same sheet" }, { status: 400 });
    }

    const sheet = goals[0].goalSheet;

    // Only the sheet owner, their manager, or admin can update achievements
    const isOwner = sheet.employeeId === session.user.id;
    const isManager = sheet.employee.managerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isManager && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Sheet must be approved to enter achievements
    if (sheet.status !== "APPROVED") {
      return Response.json({ error: "Goal sheet must be approved before entering achievements" }, { status: 400 });
    }

    // Create a map of goal id to goal for scoring
    const goalMap = new Map(goals.map((g) => [g.id, g]));

    // Upsert achievements in a transaction
    const results = await prisma.$transaction(
      achievements.map((ach) => {
        const goal = goalMap.get(ach.goalId)!;
        const score = computeScore(goal.uomType, goal.target, ach.actualValue);

        return prisma.quarterlyAchievement.upsert({
          where: {
            goalId_quarter: {
              goalId: ach.goalId,
              quarter: ach.quarter,
            },
          },
          create: {
            goalId: ach.goalId,
            quarter: ach.quarter,
            actualValue: ach.actualValue,
            status: ach.status || "NOT_STARTED",
            computedScore: score,
            updatedById: session.user.id,
          },
          update: {
            actualValue: ach.actualValue,
            status: ach.status || "NOT_STARTED",
            computedScore: score,
            updatedById: session.user.id,
          },
          include: {
            goal: {
              select: { id: true, title: true, uomType: true, target: true, weightage: true },
            },
          },
        });
      })
    );

    await createAuditLog(
      session.user.id,
      "UPDATE_ACHIEVEMENTS",
      "GoalSheet",
      sheet.id,
      null,
      achievements
    );

    return Response.json(results);
  } catch (error) {
    console.error("POST /api/achievements error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
