"use client";
import { useState, useMemo } from "react";

type SortDirection = "asc" | "desc" | null;
type SortConfig = { key: string; direction: SortDirection };

export function useSortable<T>(data: T[], defaultSort?: { key: keyof T; direction: "asc" | "desc" }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort ? { key: String(defaultSort.key), direction: defaultSort.direction } : { key: "", direction: null }
  );

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortConfig.key];
      const bVal = (b as Record<string, unknown>)[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortConfig.direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortConfig]);

  function requestSort(key: string) {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: "", direction: null };
      }
      return { key, direction: "asc" };
    });
  }

  return { sortedData, sortConfig, requestSort };
}
