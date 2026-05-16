import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeScore, getWeightedScore } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const cycleId = searchParams.get("cycleId");
    const department = searchParams.get("department");

    const where: Record<string, unknown> = { status: "APPROVED" };
    if (cycleId) where.cycleId = cycleId;
    if (department) where.employee = { department };
    if (session.user.role === "MANAGER") {
      where.employee = { ...((where.employee as Record<string, unknown>) || {}), managerId: session.user.id };
    }

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true, department: true } },
        cycle: { select: { id: true, name: true } },
        goals: {
          include: { achievements: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { employee: { name: "asc" } },
    });

    const rows = sheets.flatMap((sheet) =>
      sheet.goals.map((goal) => {
        const qData: Record<string, { actual?: number; score?: number }> = {};
        for (const ach of goal.achievements) {
          const raw = computeScore(goal.uomType, goal.target, ach.actualValue);
          qData[ach.quarter] = {
            actual: parseFloat(ach.actualValue ?? "0") || 0,
            score: Math.round(getWeightedScore(raw, goal.weightage) * 100) / 100,
          };
        }

        const scores = Object.values(qData).map((q) => q.score ?? 0).filter((s) => s > 0);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        return {
          employeeId: sheet.employee.id,
          employeeName: sheet.employee.name,
          department: sheet.employee.department,
          goalTitle: goal.title,
          thrustArea: goal.thrustArea,
          target: parseFloat(goal.target) || 0,
          uomType: goal.uomType,
          weightage: goal.weightage,
          q1Actual: qData.Q1?.actual,
          q2Actual: qData.Q2?.actual,
          q3Actual: qData.Q3?.actual,
          q4Actual: qData.Q4?.actual,
          q1Score: qData.Q1?.score,
          q2Score: qData.Q2?.score,
          q3Score: qData.Q3?.score,
          q4Score: qData.Q4?.score,
          avgScore: Math.round(avgScore * 100) / 100,
        };
      })
    );

    return Response.json(rows);
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
