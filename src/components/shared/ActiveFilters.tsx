"use client";

import { X } from "lucide-react";

type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
};

export function ActiveFilters({
  filters,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
        >
          <span className="text-blue-400 dark:text-blue-500 font-medium">
            {filter.label}:
          </span>
          {filter.value}
          <button
            onClick={filter.onRemove}
            className="ml-0.5 rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-[12px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline ml-1"
      >
        Clear all
      </button>
    </div>
  );
}
