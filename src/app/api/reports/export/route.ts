import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeightedScore } from "@/lib/scoring";
import * as XLSX from "xlsx";

// GET /api/reports/export - Export report to Excel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can export reports
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const cycleId = searchParams.get("cycleId");
    const quarter = searchParams.get("quarter");
    const department = searchParams.get("department");

    const where: Record<string, unknown> = { status: "APPROVED" };

    if (cycleId) {
      where.cycleId = cycleId;
    }

    if (department) {
      where.employee = { department };
    }

    // Managers can only export their team
    if (session.user.role === "MANAGER") {
      where.employee = { ...((where.employee as Record<string, unknown>) || {}), managerId: session.user.id };
    }

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, email: true, department: true },
        },
        cycle: {
          select: { id: true, name: true },
        },
        goals: {
          include: {
            achievements: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { employee: { name: "asc" } },
    });

    // Build rows for Excel
    const rows: Record<string, unknown>[] = [];

    for (const sheet of sheets) {
      for (const goal of sheet.goals) {
        const quarters = ["Q1", "Q2", "Q3", "Q4"];
        const achievementMap = new Map(
          goal.achievements.map((a) => [a.quarter, a])
        );

        const row: Record<string, unknown> = {
          "Employee Name": sheet.employee.name,
          "Employee Email": sheet.employee.email,
          Department: sheet.employee.department || "",
          Cycle: sheet.cycle.name,
          "Goal Title": goal.title,
          "Thrust Area": goal.thrustArea,
          "UOM Type": goal.uomType,
          Target: goal.target,
          "Weightage (%)": goal.weightage,
          "Shared Goal": goal.isShared ? "Yes" : "No",
        };

        for (const q of quarters) {
          if (quarter && q !== quarter) continue;

          const ach = achievementMap.get(q);
          row[`${q} Actual`] = ach?.actualValue || "";
          row[`${q} Status`] = ach?.status || "NOT_STARTED";
          row[`${q} Score`] = ach?.computedScore != null ? Math.round(ach.computedScore * 100) / 100 : "";
          row[`${q} Weighted`] = ach?.computedScore != null
            ? Math.round(getWeightedScore(ach.computedScore, goal.weightage) * 100) / 100
            : "";
        }

        rows.push(row);
      }
    }

    // Create summary sheet rows
    const summaryRows: Record<string, unknown>[] = [];

    for (const sheet of sheets) {
      const quarters = quarter ? [quarter] : ["Q1", "Q2", "Q3", "Q4"];
      const quarterTotals: Record<string, number> = {};

      for (const goal of sheet.goals) {
        for (const q of quarters) {
          const ach = goal.achievements.find((a) => a.quarter === q);
          if (ach?.computedScore != null) {
            quarterTotals[q] = (quarterTotals[q] || 0) + getWeightedScore(ach.computedScore, goal.weightage);
          }
        }
      }

      const quarterValues = Object.values(quarterTotals);
      const avgScore = quarterValues.length > 0
        ? quarterValues.reduce((sum, v) => sum + v, 0) / quarterValues.length
        : 0;

      const summaryRow: Record<string, unknown> = {
        "Employee Name": sheet.employee.name,
        Department: sheet.employee.department || "",
        Cycle: sheet.cycle.name,
      };

      for (const q of quarters) {
        summaryRow[`${q} Total Score`] = quarterTotals[q] != null
          ? Math.round(quarterTotals[q] * 100) / 100
          : "";
      }

      summaryRow["Average Score"] = Math.round(avgScore * 100) / 100;

      summaryRows.push(summaryRow);
    }

    // Build workbook
    const wb = XLSX.utils.book_new();

    const wsDetail = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Goal Details");

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const cycleName = sheets[0]?.cycle.name || "report";
    const filename = `goal-report-${cycleName.replace(/\s+/g, "-").toLowerCase()}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/reports/export error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
