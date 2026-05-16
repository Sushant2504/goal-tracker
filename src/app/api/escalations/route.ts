import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runEscalationCheck } from "@/lib/escalation-engine";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const rules = await prisma.escalationRule.findMany({
      orderBy: { createdAt: "desc" },
    });

    const escalations = await prisma.escalation.findMany({
      include: {
        rule: true,
        target: { select: { id: true, name: true, email: true } },
        cycle: { select: { id: true, name: true } },
      },
      orderBy: { triggeredAt: "desc" },
    });

    return Response.json({ rules, escalations });
  } catch (error) {
    console.error("GET /api/escalations error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "createRule": {
        const rule = await prisma.escalationRule.create({
          data: {
            type: body.type,
            daysThreshold: body.daysThreshold,
            escalationLevels: body.escalationLevels,
            isActive: body.isActive ?? true,
          },
        });
        return Response.json(rule);
      }

      case "toggleRule": {
        const rule = await prisma.escalationRule.update({
          where: { id: body.ruleId },
          data: { isActive: body.isActive },
        });
        return Response.json(rule);
      }

      case "runCheck": {
        const result = await runEscalationCheck();
        return Response.json({ triggered: result.escalated });
      }

      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/escalations error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
