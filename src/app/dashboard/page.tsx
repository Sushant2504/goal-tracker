import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;
  const userId = session.user.id;

  if (role === "ADMIN") {
    const [userCount, cycleCount, escalationCount, sheetCount, approvedCount, notifications] = await Promise.all([
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.goalCycle.count({ where: { status: "ACTIVE" } }),
      prisma.escalation.count({ where: { status: "OPEN" } }),
      prisma.goalSheet.count(),
      prisma.goalSheet.count({ where: { status: "APPROVED" } }),
      prisma.notification.findMany({ where: { userId, isRead: false }, take: 5, orderBy: { createdAt: "desc" } }),
    ]);
    const progress = sheetCount > 0 ? Math.round((approvedCount / sheetCount) * 100) : 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600 mt-1">Organization-wide goal management and analytics.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title="Total Employees" value={String(userCount)} subtitle="Active users" />
          <DashboardCard title="Active Cycles" value={String(cycleCount)} subtitle="Goal cycles" />
          <DashboardCard title="Organization Progress" value={`${progress}%`} subtitle="Goals approved" />
          <DashboardCard title="Open Escalations" value={String(escalationCount)} subtitle="Require attention" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <QuickActions links={[
            { label: "Manage Cycles", href: "/dashboard/admin/cycles" },
            { label: "View Reports", href: "/dashboard/admin/reports" },
            { label: "Analytics", href: "/dashboard/admin/analytics" },
            { label: "Audit Log", href: "/dashboard/admin/audit-log" },
          ]} />
          <NotificationsPanel notifications={notifications} />
        </div>
      </div>
    );
  }

  if (role === "MANAGER") {
    const [teamCount, pendingCount, approvedCount, notifications] = await Promise.all([
      prisma.user.count({ where: { managerId: userId } }),
      prisma.goalSheet.count({ where: { status: "SUBMITTED", employee: { managerId: userId } } }),
      prisma.goalSheet.count({ where: { status: "APPROVED", employee: { managerId: userId } } }),
      prisma.notification.findMany({ where: { userId, isRead: false }, take: 5, orderBy: { createdAt: "desc" } }),
    ]);
    const totalSheets = pendingCount + approvedCount;
    const progress = totalSheets > 0 ? Math.round((approvedCount / totalSheets) * 100) : 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
          <p className="text-gray-600 mt-1">Overview of your team&apos;s goals and progress.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title="Team Members" value={String(teamCount)} subtitle="Direct reports" />
          <DashboardCard title="Pending Approvals" value={String(pendingCount)} subtitle="Goals to review" />
          <DashboardCard title="Team Progress" value={`${progress}%`} subtitle="Goals approved" />
          <DashboardCard title="Approved Sheets" value={String(approvedCount)} subtitle="Completed reviews" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <QuickActions links={[
            { label: "View Team", href: "/dashboard/manager/team" },
            { label: "Approve Goals", href: "/dashboard/manager/approve" },
            { label: "Team Check-ins", href: "/dashboard/manager/checkins" },
          ]} />
          <NotificationsPanel notifications={notifications} />
        </div>
      </div>
    );
  }

  // Employee
  const [mySheet, notifications] = await Promise.all([
    prisma.goalSheet.findFirst({
      where: { employeeId: userId },
      include: { goals: true, cycle: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({ where: { userId, isRead: false }, take: 5, orderBy: { createdAt: "desc" } }),
  ]);

  const goalCount = mySheet?.goals.length ?? 0;
  const status = mySheet?.status ?? "No Sheet";
  const cycleName = mySheet?.cycle.name ?? "N/A";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Track your goals and stay on top of your progress.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Active Goals" value={String(goalCount)} subtitle={cycleName} />
        <DashboardCard title="Sheet Status" value={status} subtitle="Current status" />
        <DashboardCard title="Notifications" value={String(notifications.length)} subtitle="Unread" />
        <DashboardCard title="Cycle" value={cycleName} subtitle="Active cycle" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <QuickActions links={[
          { label: "My Goals", href: "/dashboard/employee/goals" },
          { label: "Check-ins", href: "/dashboard/employee/checkins" },
        ]} />
        <NotificationsPanel notifications={notifications} />
      </div>
    </div>
  );
}

function DashboardCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function QuickActions({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications }: { notifications: { id: string; title: string; message: string; createdAt: Date }[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No unread notifications.</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 text-sm">
              <div className="h-2 w-2 mt-1.5 rounded-full bg-indigo-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
