"use client";

import { Droppable } from "@hello-pangea/dnd";
import { GoalSheetCard, GoalSheetCardData } from "./GoalSheetCard";

const COLUMN_COLORS: Record<string, string> = {
  DRAFT: "border-t-gray-400",
  SUBMITTED: "border-t-amber-400",
  APPROVED: "border-t-emerald-400",
  RETURNED: "border-t-red-400",
};

const COLUMN_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  RETURNED: "Returned",
};

interface KanbanColumnProps {
  status: string;
  sheets: GoalSheetCardData[];
  onCardClick: (sheetId: string) => void;
}

export function KanbanColumn({ status, sheets, onCardClick }: KanbanColumnProps) {
  return (
    <div
      className={`flex flex-col rounded-lg border border-t-2 bg-gray-50/80 ${COLUMN_COLORS[status] || "border-t-gray-400"}`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200/60">
        <h3 className="text-[13px] font-semibold text-gray-700">
          {COLUMN_LABELS[status] || status}
        </h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[11px] font-medium text-gray-600">
          {sheets.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-2 p-2 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? "bg-indigo-50/50" : ""
            }`}
          >
            {sheets.map((sheet, index) => (
              <GoalSheetCard
                key={sheet.id}
                sheet={sheet}
                index={index}
                onClick={onCardClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
