import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.appSettings.findFirst();
    return Response.json(settings ?? {});
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const existing = await prisma.appSettings.findFirst();

    const data = {
      smtpHost: body.smtpHost ?? "",
      smtpPort: body.smtpPort ?? "587",
      smtpUser: body.smtpUser ?? "",
      smtpPass: body.smtpPass ?? "",
      smtpFrom: body.smtpFrom ?? "",
      teamsWebhookUrl: body.teamsWebhookUrl ?? "",
      azureTenantId: body.azureTenantId ?? "",
      azureClientId: body.azureClientId ?? "",
      azureClientSecret: body.azureClientSecret ?? "",
    };

    const settings = existing
      ? await prisma.appSettings.update({ where: { id: existing.id }, data })
      : await prisma.appSettings.create({ data });

    return Response.json(settings);
  } catch (error) {
    console.error("POST /api/admin/settings error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
