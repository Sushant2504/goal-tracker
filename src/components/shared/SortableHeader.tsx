"use client";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" | null };
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActive = currentSort.key === sortKey;
  return (
    <button
      className={cn("flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors group", className)}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className={cn("transition-colors", isActive ? "text-blue-600" : "text-gray-300 group-hover:text-gray-400")}>
        {isActive && currentSort.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : isActive && currentSort.direction === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3" />
        )}
      </span>
    </button>
  );
}
