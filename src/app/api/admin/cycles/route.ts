import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET /api/admin/cycles - List all goal cycles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const cycles = await prisma.goalCycle.findMany({
      where,
      include: {
        _count: { select: { goalSheets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(cycles);
  } catch (error) {
    console.error("GET /api/admin/cycles error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/cycles - Create a new goal cycle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden: Only admins can create cycles" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      goalSettingOpens,
      goalSettingCloses,
      q1Opens,
      q1Closes,
      q2Opens,
      q2Closes,
      q3Opens,
      q3Closes,
      q4Opens,
      q4Closes,
    } = body;

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    // Validate all date fields are present
    const dateFields = {
      goalSettingOpens, goalSettingCloses,
      q1Opens, q1Closes, q2Opens, q2Closes,
      q3Opens, q3Closes, q4Opens, q4Closes,
    };

    for (const [field, value] of Object.entries(dateFields)) {
      if (!value) {
        return Response.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const cycle = await prisma.goalCycle.create({
      data: {
        name,
        goalSettingOpens: new Date(goalSettingOpens),
        goalSettingCloses: new Date(goalSettingCloses),
        q1Opens: new Date(q1Opens),
        q1Closes: new Date(q1Closes),
        q2Opens: new Date(q2Opens),
        q2Closes: new Date(q2Closes),
        q3Opens: new Date(q3Opens),
        q3Closes: new Date(q3Closes),
        q4Opens: new Date(q4Opens),
        q4Closes: new Date(q4Closes),
      },
    });

    await createAuditLog(session.user.id, "CREATE", "GoalCycle", cycle.id, null, { name });

    return Response.json(cycle, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/cycles error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/cycles - Update a goal cycle
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden: Only admins can update cycles" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.goalCycle.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Goal cycle not found" }, { status: 404 });
    }

    // Convert date strings to Date objects
    const data: Record<string, unknown> = {};
    const dateKeys = [
      "goalSettingOpens", "goalSettingCloses",
      "q1Opens", "q1Closes", "q2Opens", "q2Closes",
      "q3Opens", "q3Closes", "q4Opens", "q4Closes",
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (dateKeys.includes(key) && value) {
        data[key] = new Date(value as string);
      } else if (value !== undefined) {
        data[key] = value;
      }
    }

    const cycle = await prisma.goalCycle.update({
      where: { id },
      data,
    });

    await createAuditLog(session.user.id, "UPDATE", "GoalCycle", id, existing, cycle);

    return Response.json(cycle);
  } catch (error) {
    console.error("PUT /api/admin/cycles error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
