"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { GoalDetailPanel } from "@/components/goals/GoalDetailPanel";
import { GoalSheetCardData } from "@/components/board/GoalSheetCard";
import { CycleProgressBar } from "@/components/shared/CycleProgressBar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, LayoutGrid, X } from "lucide-react";

const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED"] as const;

interface Cycle {
  id: string;
  name: string;
  status: string;
  goalSettingOpens: string;
  goalSettingCloses: string;
  q1Opens: string;
  q1Closes: string;
  q2Opens: string;
  q2Closes: string;
  q3Opens: string;
  q3Closes: string;
  q4Opens: string;
  q4Closes: string;
}

type FilterType = "all" | "department" | "assignee";

interface ActiveFilter {
  type: FilterType;
  value: string;
}

export default function BoardPage() {
  const { data: session } = useSession();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [sheets, setSheets] = useState<GoalSheetCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelSheetId, setPanelSheetId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Fetch cycles
  useEffect(() => {
    async function loadCycles() {
      try {
        const res = await fetch("/api/admin/cycles");
        if (res.ok) {
          const data: Cycle[] = await res.json();
          setCycles(data);
          // Auto-select first active cycle, or fallback to first
          const active = data.find((c) => c.status === "ACTIVE");
          if (active) {
            setSelectedCycleId(active.id);
          } else if (data.length > 0) {
            setSelectedCycleId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch cycles:", error);
      }
    }
    loadCycles();
  }, []);

  // Fetch sheets for selected cycle
  const fetchSheets = useCallback(async () => {
    if (!selectedCycleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/goal-sheets?team=true&cycleId=${selectedCycleId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSheets(data);
      }
    } catch (error) {
      console.error("Failed to fetch goal sheets:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  // Extract unique departments and top assignees for quick filters
  const departments = useMemo(() => {
    const depts = new Set<string>();
    sheets.forEach((s) => {
      if (s.employee.department) depts.add(s.employee.department);
    });
    return Array.from(depts).sort();
  }, [sheets]);

  const topAssignees = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    sheets.forEach((s) => {
      const existing = counts.get(s.employee.id);
      if (existing) {
        existing.count++;
      } else {
        counts.set(s.employee.id, { name: s.employee.name, count: 1 });
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, name: data.name }));
  }, [sheets]);

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.id === selectedCycleId) ?? null,
    [cycles, selectedCycleId]
  );

  // Filter sheets based on active filters (AND logic)
  const filteredSheets = useMemo(() => {
    if (activeFilters.length === 0) return sheets;
    return sheets.filter((sheet) => {
      return activeFilters.every((filter) => {
        if (filter.type === "department") {
          return sheet.employee.department === filter.value;
        }
        if (filter.type === "assignee") {
          return sheet.employee.name === filter.value;
        }
        return true;
      });
    });
  }, [sheets, activeFilters]);

  function toggleFilter(type: FilterType, value: string) {
    if (type === "all") {
      setActiveFilters([]);
      return;
    }
    setActiveFilters((prev) => {
      const exists = prev.find((f) => f.type === type && f.value === value);
      if (exists) {
        return prev.filter((f) => !(f.type === type && f.value === value));
      }
      return [...prev, { type, value }];
    });
  }

  function isFilterActive(type: FilterType, value: string): boolean {
    if (type === "all") return activeFilters.length === 0;
    return activeFilters.some((f) => f.type === type && f.value === value);
  }

  function getSheetsByStatus(status: string): GoalSheetCardData[] {
    return filteredSheets.filter((s) => s.status === status);
  }

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

    // Optimistic update
    setSheets((prev) =>
      prev.map((s) =>
        s.id === draggableId ? { ...s, status: newStatus } : s
      )
    );

    try {
      let res: Response;

      // Use dedicated endpoints for APPROVED/RETURNED transitions from SUBMITTED
      if (newStatus === "APPROVED" && oldStatus === "SUBMITTED") {
        res = await fetch(`/api/goal-sheets/${draggableId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } else if (newStatus === "RETURNED" && oldStatus === "SUBMITTED") {
        res = await fetch(`/api/goal-sheets/${draggableId}/return`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: "Returned via board" }),
        });
      } else {
        // Use the generic status endpoint for other transitions
        res = await fetch(`/api/goal-sheets/${draggableId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      }

      if (!res.ok) {
        // Revert on failure
        setSheets((prev) =>
          prev.map((s) =>
            s.id === draggableId ? { ...s, status: oldStatus } : s
          )
        );
        console.error("Failed to update status:", await res.text());
      }
    } catch (error) {
      // Revert on error
      setSheets((prev) =>
        prev.map((s) =>
          s.id === draggableId ? { ...s, status: oldStatus } : s
        )
      );
      console.error("Failed to update status:", error);
    }
  }

  function handleCardClick(sheetId: string) {
    setPanelSheetId(sheetId);
    setPanelOpen(true);
  }

  if (!session?.user) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4.5 w-4.5 text-gray-500" />
          <h1 className="text-[15px] font-semibold text-gray-900">Board</h1>
        </div>

        <Select
          value={selectedCycleId}
          onValueChange={(val) => val && setSelectedCycleId(val)}
        >
          <SelectTrigger size="sm" className="w-[200px]">
            <SelectValue placeholder="Select cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cycle Progress Bar */}
      {selectedCycle && (
        <div className="mb-3">
          <CycleProgressBar
            cycle={{
              goalSettingOpens: selectedCycle.goalSettingOpens,
              goalSettingCloses: selectedCycle.goalSettingCloses,
              q1Opens: selectedCycle.q1Opens,
              q1Closes: selectedCycle.q1Closes,
              q2Opens: selectedCycle.q2Opens,
              q2Closes: selectedCycle.q2Closes,
              q3Opens: selectedCycle.q3Opens,
              q3Closes: selectedCycle.q3Closes,
              q4Opens: selectedCycle.q4Opens,
              q4Closes: selectedCycle.q4Closes,
            }}
          />
        </div>
      )}

      {/* Quick Filters */}
      {!loading && sheets.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap animate-fade-in">
          {/* All chip */}
          <button
            onClick={() => toggleFilter("all", "")}
            className={`text-[12px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
              isFilterActive("all", "")
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            All
          </button>

          {/* Department chips */}
          {departments.map((dept) => (
            <button
              key={`dept-${dept}`}
              onClick={() => toggleFilter("department", dept)}
              className={`text-[12px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                isFilterActive("department", dept)
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {dept}
            </button>
          ))}

          {/* Assignee chips */}
          {topAssignees.map((assignee) => (
            <button
              key={`assignee-${assignee.id}`}
              onClick={() => toggleFilter("assignee", assignee.name)}
              className={`text-[12px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                isFilterActive("assignee", assignee.name)
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {assignee.name}
            </button>
          ))}

          {/* Clear filters */}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 ml-1 cursor-pointer"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-3 flex-1 min-h-0 animate-fade-in-up">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                sheets={getSheetsByStatus(status)}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Detail Panel */}
      <GoalDetailPanel
        sheetId={panelSheetId}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </div>
  );
}
