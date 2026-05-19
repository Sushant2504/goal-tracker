"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Target,
  LayoutDashboard,
  Goal,
  ClipboardCheck,
  Users,
  CheckCircle,
  CalendarRange,
  Share2,
  AlertTriangle,
  BarChart3,
  LineChart,
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Columns3,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const employeeSections: NavSection[] = [
  {
    title: "Planning",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Board", href: "/dashboard/board", icon: Columns3 },
      { label: "My Goals", href: "/dashboard/employee/goals", icon: Goal },
      { label: "Check-ins", href: "/dashboard/employee/checkins", icon: ClipboardCheck },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
];

const managerSections: NavSection[] = [
  {
    title: "Planning",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Board", href: "/dashboard/board", icon: Columns3 },
      { label: "My Team", href: "/dashboard/manager/team", icon: Users },
      { label: "Approve Goals", href: "/dashboard/manager/approve", icon: CheckCircle },
      { label: "Check-ins", href: "/dashboard/manager/checkins", icon: ClipboardCheck },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    title: "Planning",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Board", href: "/dashboard/board", icon: Columns3 },
      { label: "Employees", href: "/dashboard/admin/employees", icon: Users },
      { label: "Cycles", href: "/dashboard/admin/cycles", icon: CalendarRange },
      { label: "Shared Goals", href: "/dashboard/admin/shared-goals", icon: Share2 },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
      { label: "Analytics", href: "/dashboard/admin/analytics", icon: LineChart },
      { label: "Escalations", href: "/dashboard/admin/escalations", icon: AlertTriangle },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Audit Log", href: "/dashboard/admin/audit-log", icon: ScrollText },
      { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
    ],
  },
];

function getSections(role: string): NavSection[] {
  switch (role) {
    case "ADMIN":
      return adminSections;
    case "MANAGER":
      return managerSections;
    default:
      return employeeSections;
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "MANAGER":
      return "Manager";
    default:
      return "Employee";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role || "EMPLOYEE";
  const sections = getSections(role);
  const userName = session?.user?.name || "User";
  const roleLabel = getRoleLabel(role);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-gray-200/80 transition-all duration-200",
        collapsed ? "w-[56px]" : "w-56"
      )}
    >
      <div className="flex items-center justify-between h-12 px-3 bg-blue-700 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/20">
            <Target className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-bold text-white tracking-tight truncate">
              AtomBurg Nexus
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="hidden lg:flex h-6 w-6 shrink-0 items-center justify-center rounded text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <Menu className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section, si) => (
          <div key={si}>
            {si > 0 && <Separator className="my-2 mx-1" />}
            {!collapsed && section.title && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all active:scale-[0.98] relative",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-gray-600"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-700 rounded-r-full animate-scale-in" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200/80 p-2 shrink-0">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md p-1.5",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
            {getInitials(userName)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate leading-tight">
                {userName}
              </p>
              <p className="text-[10px] text-gray-400 truncate leading-tight">
                {roleLabel}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors mt-0.5",
            collapsed ? "justify-center px-0" : ""
          )}
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role || "EMPLOYEE";
  const sections = getSections(role);
  const userName = session?.user?.name || "User";
  const roleLabel = getRoleLabel(role);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-50 w-60 bg-white shadow-xl lg:hidden flex flex-col">
        <div className="flex items-center justify-between h-12 px-3 bg-blue-700 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={onClose}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
              <Target className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">
              AtomBurg Nexus
            </span>
          </Link>
          <button
            onClick={onClose}
            className="h-6 w-6 flex items-center justify-center rounded text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((section, si) => (
            <div key={si}>
              {si > 0 && <Separator className="my-2 mx-1" />}
              {section.title && (
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all active:scale-[0.98] relative",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-blue-600" : "text-gray-400"
                        )}
                      />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-700 rounded-r-full animate-scale-in" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200/80 p-2 shrink-0">
          <div className="flex items-center gap-2 rounded-md p-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate leading-tight">
                {userName}
              </p>
              <p className="text-[10px] text-gray-400 truncate leading-tight">
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors mt-0.5"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}
