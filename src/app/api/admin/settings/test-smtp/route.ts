import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { smtpHost, smtpPort, smtpUser, smtpFrom, recipientEmail } = body;

    if (!smtpHost || !smtpFrom || !recipientEmail) {
      return Response.json(
        { error: "SMTP host, from address, and recipient are required" },
        { status: 400 }
      );
    }

    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587"),
        secure: smtpPort === "465",
        auth: smtpUser ? { user: smtpUser, pass: body.smtpPass } : undefined,
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject: "AtomBurg Nexus - SMTP Test",
        text: "This is a test email from AtomBurg Nexus to verify SMTP settings.",
        html: "<h2>AtomBurg Nexus SMTP Test</h2><p>Your SMTP settings are configured correctly.</p>",
      });

      return Response.json({ success: true, message: "Test email sent successfully" });
    } catch (smtpError) {
      const msg = smtpError instanceof Error ? smtpError.message : "SMTP connection failed";
      return Response.json({ error: msg }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/admin/settings/test-smtp error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
