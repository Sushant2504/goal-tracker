import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET /api/goal-sheets/[id]/comments - Get comments for a goal sheet
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

    // Verify goal sheet exists
    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        employee: { select: { managerId: true } },
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

    const comments = await prisma.auditLog.findMany({
      where: {
        entityType: "GoalSheet",
        entityId: id,
        action: "COMMENT",
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return Response.json(comments);
  } catch (error) {
    console.error("GET /api/goal-sheets/[id]/comments error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/goal-sheets/[id]/comments - Add a comment to a goal sheet
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

    // Verify goal sheet exists
    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        employee: { select: { managerId: true } },
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

    const body = await request.json();
    const { comment } = body as { comment: string };

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return Response.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    await createAuditLog(
      session.user.id,
      "COMMENT",
      "GoalSheet",
      id,
      null,
      comment.trim()
    );

    // Fetch the newly created comment to return it
    const latestComment = await prisma.auditLog.findFirst({
      where: {
        entityType: "GoalSheet",
        entityId: id,
        action: "COMMENT",
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return Response.json(latestComment, { status: 201 });
  } catch (error) {
    console.error("POST /api/goal-sheets/[id]/comments error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
