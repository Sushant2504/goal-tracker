"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/layout/Sidebar";
import { Menu, Bell } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top header bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {getGreeting()}, {session?.user?.name?.split(" ")[0] || "User"}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {session?.user?.department
                  ? `${session.user.department} Department`
                  : "Welcome to GoalTracker"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/notifications")}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {(session?.user?.name || "U")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
