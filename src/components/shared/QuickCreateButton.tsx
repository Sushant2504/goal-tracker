"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, FileText, LayoutGrid, Users, CalendarRange, CheckCircle, ClipboardCheck, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
}

const ROLE_ACTIONS: Record<string, QuickAction[]> = {
  EMPLOYEE: [
    { label: "New Goal Sheet", href: "/dashboard/employee/goals", icon: FileText },
    { label: "View Board", href: "/dashboard/board", icon: LayoutGrid },
  ],
  MANAGER: [
    { label: "Approve Goals", href: "/dashboard/manager/approve", icon: CheckCircle },
    { label: "View Team", href: "/dashboard/manager/team", icon: Users },
    { label: "Check-ins", href: "/dashboard/manager/checkins", icon: ClipboardCheck },
    { label: "View Board", href: "/dashboard/board", icon: LayoutGrid },
  ],
  ADMIN: [
    { label: "Manage Cycles", href: "/dashboard/admin/cycles", icon: CalendarRange },
    { label: "View Board", href: "/dashboard/board", icon: LayoutGrid },
  ],
};

export function QuickCreateButton() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger scale-in animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!session?.user?.role) return null;

  const role = session.user.role as string;
  const actions = ROLE_ACTIONS[role];
  if (!actions) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-transform duration-300 ${
        mounted ? "scale-100" : "scale-0"
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg hover:bg-blue-800 hover:shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.href}
                onSelect={() => router.push(action.href)}
                className="cursor-pointer"
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
