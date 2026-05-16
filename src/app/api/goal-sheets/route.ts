import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET /api/goal-sheets - List goal sheets for current user or team (managers)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const cycleId = searchParams.get("cycleId");
    const team = searchParams.get("team"); // "true" for managers to see team sheets
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (cycleId) {
      where.cycleId = cycleId;
    }

    if (status) {
      where.status = status;
    }

    // Managers can view their team's sheets
    if (team === "true" && (session.user.role === "MANAGER" || session.user.role === "ADMIN")) {
      if (session.user.role === "MANAGER") {
        where.employee = { managerId: session.user.id };
      }
      // ADMIN sees all when team=true
    } else if (session.user.role !== "ADMIN") {
      // Regular employees see only their own
      where.employeeId = session.user.id;
    }

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true, department: true } },
        cycle: { select: { id: true, name: true, status: true } },
        goals: { select: { id: true, title: true, weightage: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return Response.json(sheets);
  } catch (error) {
    console.error("GET /api/goal-sheets error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/goal-sheets - Create a new goal sheet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cycleId } = body;

    if (!cycleId) {
      return Response.json({ error: "cycleId is required" }, { status: 400 });
    }

    // Verify cycle exists and is active
    const cycle = await prisma.goalCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      return Response.json({ error: "Goal cycle not found" }, { status: 404 });
    }
    if (cycle.status !== "ACTIVE") {
      return Response.json({ error: "Goal cycle is not active" }, { status: 400 });
    }

    // Check if goal setting window is open
    const now = new Date();
    if (now < cycle.goalSettingOpens || now > cycle.goalSettingCloses) {
      return Response.json({ error: "Goal setting window is not open" }, { status: 400 });
    }

    // Check for existing sheet for this cycle
    const existing = await prisma.goalSheet.findUnique({
      where: { employeeId_cycleId: { employeeId: session.user.id, cycleId } },
    });
    if (existing) {
      return Response.json({ error: "Goal sheet already exists for this cycle" }, { status: 409 });
    }

    const sheet = await prisma.goalSheet.create({
      data: {
        employeeId: session.user.id,
        cycleId,
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        cycle: { select: { id: true, name: true } },
      },
    });

    await createAuditLog(session.user.id, "CREATE", "GoalSheet", sheet.id, null, {
      cycleId,
      status: "DRAFT",
    });

    return Response.json(sheet, { status: 201 });
  } catch (error) {
    console.error("POST /api/goal-sheets error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
