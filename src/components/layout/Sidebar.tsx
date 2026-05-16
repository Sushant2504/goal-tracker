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
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const employeeNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Goals", href: "/dashboard/employee/goals", icon: Goal },
  { label: "Check-ins", href: "/dashboard/employee/checkins", icon: ClipboardCheck },
];

const managerNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Team", href: "/dashboard/manager/team", icon: Users },
  { label: "Approve Goals", href: "/dashboard/manager/approve", icon: CheckCircle },
  { label: "Check-ins", href: "/dashboard/manager/checkins", icon: ClipboardCheck },
];

const adminNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/dashboard/admin/employees", icon: Users },
  { label: "Cycles", href: "/dashboard/admin/cycles", icon: CalendarRange },
  { label: "Shared Goals", href: "/dashboard/admin/shared-goals", icon: Share2 },
  { label: "Escalations", href: "/dashboard/admin/escalations", icon: AlertTriangle },
  { label: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
  { label: "Analytics", href: "/dashboard/admin/analytics", icon: LineChart },
  { label: "Audit Log", href: "/dashboard/admin/audit-log", icon: ScrollText },
  { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
];

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "ADMIN":
      return adminNav;
    case "MANAGER":
      return managerNav;
    default:
      return employeeNav;
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
  const navItems = getNavItems(role);
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const roleLabel = getRoleLabel(role);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
            <Target className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-gray-900 tracking-tight truncate">
              GoalTracker
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!collapsed && (
          <div className="px-3 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Navigation
            </p>
          </div>
        )}
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors group relative",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive
                    ? "text-indigo-600"
                    : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-3 shrink-0">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
            {getInitials(userName)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {roleLabel}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors mt-1",
            collapsed ? "justify-center px-0" : ""
          )}
          title="Sign out"
        >
          <LogOut className="h-5 w-5 shrink-0" />
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
  const navItems = getNavItems(role);
  const userName = session?.user?.name || "User";
  const roleLabel = getRoleLabel(role);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={onClose}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Target className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              GoalTracker
            </span>
          </Link>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Navigation
            </p>
          </div>
          {navItems.map((item) => {
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-indigo-600" : "text-gray-400"
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-3 shrink-0">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors mt-1"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}
