import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    return Response.json({
      notifications,
      total,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      // Mark all user's notifications as read
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });

      return Response.json({ message: "All notifications marked as read" });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return Response.json(
        { error: "notificationIds array or markAllRead is required" },
        { status: 400 }
      );
    }

    // Verify ownership and update
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
      },
      data: { isRead: true },
    });

    return Response.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
