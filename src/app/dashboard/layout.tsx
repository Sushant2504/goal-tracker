"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/layout/Sidebar";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { UserProfileDropdown } from "@/components/layout/UserProfileDropdown";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { TopLoadingBar } from "@/components/layout/TopLoadingBar";

import { Menu, Search } from "lucide-react";

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
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-200 border-t-blue-700 dark:border-blue-800 dark:border-t-blue-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-slate-100/50 dark:from-gray-950 dark:to-gray-900">
      <Suspense>
        <TopLoadingBar />
      </Suspense>
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-12 items-center justify-between border-b border-gray-200/80 bg-white dark:bg-gray-900 dark:border-gray-800 px-4 sm:px-5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <span className="text-[13px] font-medium text-gray-700">
              {session?.user?.department || "AtomBurg Nexus"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="hidden sm:flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-[12px] text-gray-400 hover:bg-gray-50"
              onClick={() =>
                window.dispatchEvent(new Event("open-command-palette"))
              }
            >
              <Search className="h-3 w-3" />
              <span>Search...</span>
              <kbd className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <NotificationsDropdown />
            <UserProfileDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-4">
          {children}
        </main>

      </div>

      <CommandPalette />
      <KeyboardShortcutsDialog />
    </div>
  );
}
