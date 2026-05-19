"use client";

import { useSession, signOut } from "next-auth/react";
import { Keyboard, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getRoleLabel(role: string | undefined): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "MANAGER":
      return "Manager";
    default:
      return "Employee";
  }
}

export function UserProfileDropdown() {
  const { data: session } = useSession();

  const user = session?.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="flex items-center gap-2 rounded-md p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="User menu"
          />
        }
      >
        <div className="hidden sm:block text-right">
          <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200 leading-tight">
            {user?.name}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
            {getRoleLabel(user?.role)}
          </p>
        </div>
        <UserAvatar name={user?.name || "U"} size="sm" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <div className="px-3 py-2.5">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
            {user?.name}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {user?.email}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {getRoleLabel(user?.role)}
            </span>
            {user?.department && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {user.department}
              </span>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            window.dispatchEvent(new Event("open-shortcuts"));
          }}
        >
          <Keyboard className="h-4 w-4" />
          <span>Keyboard Shortcuts</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
