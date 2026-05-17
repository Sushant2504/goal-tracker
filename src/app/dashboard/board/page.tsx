"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { GoalDetailPanel } from "@/components/goals/GoalDetailPanel";
import { GoalSheetCardData } from "@/components/board/GoalSheetCard";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, LayoutGrid } from "lucide-react";

const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED"] as const;

interface Cycle {
  id: string;
  name: string;
  status: string;
}

export default function BoardPage() {
  const { data: session } = useSession();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [sheets, setSheets] = useState<GoalSheetCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelSheetId, setPanelSheetId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

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

  function getSheetsByStatus(status: string): GoalSheetCardData[] {
    return sheets.filter((s) => s.status === status);
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

      {/* Board */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-3 flex-1 min-h-0">
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
