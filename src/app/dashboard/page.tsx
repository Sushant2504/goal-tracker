import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  CalendarRange,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Goal,
  ClipboardCheck,
  BarChart3,
  ScrollText,
  LineChart,
  ChevronRight,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;

  if (role === "ADMIN") {
    const [userCount, cycleCount, escalationCount, sheetCount, approvedCount, notifications] =
      await Promise.all([
        prisma.user.count({ where: { role: "EMPLOYEE" } }),
        prisma.goalCycle.count({ where: { status: "ACTIVE" } }),
        prisma.escalation.count({ where: { status: "OPEN" } }),
        prisma.goalSheet.count(),
        prisma.goalSheet.count({ where: { status: "APPROVED" } }),
        prisma.notification.findMany({
          where: { userId, isRead: false },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
      ]);
    const progress = sheetCount > 0 ? Math.round((approvedCount / sheetCount) * 100) : 0;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Organization-wide goal management
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} iconBg="bg-indigo-50" title="Employees" value={userCount} />
          <Stat icon={CalendarRange} iconBg="bg-blue-50" title="Active Cycles" value={cycleCount} />
          <Stat icon={TrendingUp} iconBg="bg-emerald-50" title="Progress" value={`${progress}%`} />
          <Stat icon={AlertTriangle} iconBg="bg-red-50" title="Escalations" value={escalationCount} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickNav
              links={[
                { label: "Manage Cycles", href: "/dashboard/admin/cycles", icon: CalendarRange },
                { label: "View Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
                { label: "Analytics", href: "/dashboard/admin/analytics", icon: LineChart },
                { label: "Audit Log", href: "/dashboard/admin/audit-log", icon: ScrollText },
                { label: "Employees", href: "/dashboard/admin/employees", icon: Users },
                { label: "Escalations", href: "/dashboard/admin/escalations", icon: AlertTriangle },
              ]}
            />
          </div>
          <Notifications items={notifications} />
        </div>
      </div>
    );
  }

  if (role === "MANAGER") {
    const [teamCount, pendingCount, approvedCount, notifications] = await Promise.all([
      prisma.user.count({ where: { managerId: userId } }),
      prisma.goalSheet.count({ where: { status: "SUBMITTED", employee: { managerId: userId } } }),
      prisma.goalSheet.count({ where: { status: "APPROVED", employee: { managerId: userId } } }),
      prisma.notification.findMany({
        where: { userId, isRead: false },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const totalSheets = pendingCount + approvedCount;
    const progress = totalSheets > 0 ? Math.round((approvedCount / totalSheets) * 100) : 0;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Your team&apos;s goals and progress
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} iconBg="bg-indigo-50" title="Team Members" value={teamCount} />
          <Stat icon={Clock} iconBg="bg-amber-50" title="Pending Approvals" value={pendingCount} />
          <Stat icon={TrendingUp} iconBg="bg-emerald-50" title="Team Progress" value={`${progress}%`} />
          <Stat icon={CheckCircle} iconBg="bg-emerald-50" title="Approved" value={approvedCount} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickNav
              links={[
                { label: "View Team", href: "/dashboard/manager/team", icon: Users },
                { label: "Approve Goals", href: "/dashboard/manager/approve", icon: CheckCircle },
                { label: "Team Check-ins", href: "/dashboard/manager/checkins", icon: ClipboardCheck },
              ]}
            />
          </div>
          <Notifications items={notifications} />
        </div>
      </div>
    );
  }

  const [mySheet, notifications] = await Promise.all([
    prisma.goalSheet.findFirst({
      where: { employeeId: userId },
      include: { goals: true, cycle: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId, isRead: false },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const goalCount = mySheet?.goals.length ?? 0;
  const status = mySheet?.status ?? "No Sheet";
  const cycleName = mySheet?.cycle.name ?? "N/A";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Track your goals and progress
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat icon={Goal} iconBg="bg-indigo-50" title="Active Goals" value={goalCount} />
        <Stat icon={CheckCircle} iconBg="bg-emerald-50" title="Sheet Status" value={status} />
        <Stat icon={CalendarRange} iconBg="bg-blue-50" title="Cycle" value={cycleName} />
        <Stat icon={AlertTriangle} iconBg="bg-amber-50" title="Notifications" value={notifications.length} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickNav
            links={[
              { label: "My Goals", href: "/dashboard/employee/goals", icon: Goal },
              { label: "Check-ins", href: "/dashboard/employee/checkins", icon: ClipboardCheck },
            ]}
          />
        </div>
        <Notifications items={notifications} />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  iconBg,
  title,
  value,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg}`}>
          <Icon className="h-3.5 w-3.5 text-gray-600" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickNav({
  links,
}: {
  links: { label: string; href: string; icon: React.ElementType }[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <h3 className="text-[13px] font-semibold text-gray-900">Quick Actions</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors group"
          >
            <link.icon className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
            <span className="flex-1">{link.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Notifications({
  items,
}: {
  items: { id: string; title: string; message: string; createdAt: Date }[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <h3 className="text-[13px] font-semibold text-gray-900">Notifications</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-gray-400 text-center py-6">
          No unread notifications
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((n) => (
            <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5">
              <div className="h-1.5 w-1.5 mt-1.5 rounded-full bg-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">{n.title}</p>
                <p className="text-[11px] text-gray-400 truncate">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
