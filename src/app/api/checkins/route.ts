import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET /api/checkins - List check-ins
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

    const where: Record<string, unknown> = { goalSheetId };
    if (quarter) {
      where.quarter = quarter;
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true, email: true } },
        goalSheet: {
          select: {
            id: true,
            employee: { select: { id: true, name: true } },
            cycle: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { checkedInAt: "desc" },
    });

    return Response.json(checkIns);
  } catch (error) {
    console.error("GET /api/checkins error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/checkins - Create or update a check-in
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { goalSheetId, quarter, employeeNotes, managerComment } = body;

    if (!goalSheetId || !quarter) {
      return Response.json({ error: "goalSheetId and quarter are required" }, { status: 400 });
    }

    const validQuarters = ["Q1", "Q2", "Q3", "Q4"];
    if (!validQuarters.includes(quarter)) {
      return Response.json({ error: `Invalid quarter: ${quarter}` }, { status: 400 });
    }

    // Verify the goal sheet exists and is approved
    const sheet = await prisma.goalSheet.findUnique({
      where: { id: goalSheetId },
      include: {
        employee: { select: { id: true, name: true, managerId: true } },
      },
    });

    if (!sheet) {
      return Response.json({ error: "Goal sheet not found" }, { status: 404 });
    }

    if (sheet.status !== "APPROVED") {
      return Response.json({ error: "Goal sheet must be approved for check-ins" }, { status: 400 });
    }

    const isOwner = sheet.employeeId === session.user.id;
    const isManager = sheet.employee.managerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isManager && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine manager ID: if the employee is checking in, use their manager.
    // If a manager is checking in, use themselves.
    let managerId: string;
    if (isManager) {
      managerId = session.user.id;
    } else if (isAdmin) {
      managerId = session.user.id;
    } else {
      // Employee creating a check-in; manager is required
      if (!sheet.employee.managerId) {
        return Response.json({ error: "No manager assigned to this employee" }, { status: 400 });
      }
      managerId = sheet.employee.managerId;
    }

    // Upsert the check-in
    const existing = await prisma.checkIn.findUnique({
      where: { goalSheetId_quarter: { goalSheetId, quarter } },
    });

    const data: Record<string, unknown> = { managerId };

    // Employee can update employeeNotes, manager can update managerComment
    if (isOwner && employeeNotes !== undefined) {
      data.employeeNotes = employeeNotes;
    }
    if ((isManager || isAdmin) && managerComment !== undefined) {
      data.managerComment = managerComment;
    }
    // If both fields provided (e.g., admin), allow both
    if (isAdmin) {
      if (employeeNotes !== undefined) data.employeeNotes = employeeNotes;
      if (managerComment !== undefined) data.managerComment = managerComment;
    }

    const checkIn = await prisma.checkIn.upsert({
      where: { goalSheetId_quarter: { goalSheetId, quarter } },
      create: {
        goalSheetId,
        quarter,
        employeeNotes: employeeNotes || null,
        managerComment: managerComment || null,
        managerId,
      },
      update: data,
      include: {
        manager: { select: { id: true, name: true } },
      },
    });

    // Notify the other party
    if (isOwner && sheet.employee.managerId) {
      await prisma.notification.create({
        data: {
          userId: sheet.employee.managerId,
          type: "CHECKIN_CREATED",
          title: "Check-in Update",
          message: `${sheet.employee.name} has added notes for ${quarter} check-in.`,
          link: `/goal-sheets/${goalSheetId}`,
        },
      });
    } else if (isManager) {
      await prisma.notification.create({
        data: {
          userId: sheet.employeeId,
          type: "CHECKIN_COMMENT",
          title: "Manager Check-in Comment",
          message: `${session.user.name} has commented on your ${quarter} check-in.`,
          link: `/goal-sheets/${goalSheetId}`,
        },
      });
    }

    await createAuditLog(
      session.user.id,
      existing ? "UPDATE" : "CREATE",
      "CheckIn",
      checkIn.id,
      existing,
      { goalSheetId, quarter, employeeNotes, managerComment }
    );

    return Response.json(checkIn, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("POST /api/checkins error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
