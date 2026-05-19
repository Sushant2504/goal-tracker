"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
];

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = hash + name.charCodeAt(i);
  return hash % AVATAR_COLORS.length;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({
  name,
  size = "sm",
  className,
  showTooltip = false,
  department,
  role,
}: {
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  showTooltip?: boolean;
  department?: string;
  role?: string;
}) {
  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
  };

  const colors = AVATAR_COLORS[getColorIndex(name)];

  const avatar = (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className={`${colors.bg} ${colors.text} font-semibold`}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) {
    return avatar;
  }

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          {avatar}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-2"
        >
          <p className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">
            {name}
          </p>
          {department && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {department}
            </p>
          )}
          {role && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {role}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
