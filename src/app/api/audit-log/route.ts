import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/audit-log - Audit log entries with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view audit logs
    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden: Only admins can view audit logs" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = action;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (from || to) {
      const timestampFilter: Record<string, Date> = {};
      if (from) timestampFilter.gte = new Date(from);
      if (to) timestampFilter.lte = new Date(to);
      where.timestamp = timestampFilter;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return Response.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/audit-log error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
