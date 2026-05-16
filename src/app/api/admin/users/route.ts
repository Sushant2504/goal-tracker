import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users - List users with optional role filter
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and managers can list users
    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const managerId = searchParams.get("managerId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (department) {
      where.department = department;
    }

    if (managerId) {
      where.managerId = managerId;
    }

    // For managers, only show their direct reports (unless also an admin)
    if (session.user.role === "MANAGER") {
      where.managerId = session.user.id;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        managerId: true,
        avatarUrl: true,
        createdAt: true,
        manager: { select: { id: true, name: true } },
        _count: { select: { reports: true, goalSheets: true } },
      },
      orderBy: { name: "asc" },
    });

    return Response.json(users);
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
