"use client";

import { Droppable } from "@hello-pangea/dnd";
import { GoalSheetCard, GoalSheetCardData } from "./GoalSheetCard";

const COLUMN_COLORS: Record<string, string> = {
  DRAFT: "border-t-gray-400",
  SUBMITTED: "border-t-amber-400",
  APPROVED: "border-t-emerald-400",
  RETURNED: "border-t-red-400",
};

const COLUMN_BG: Record<string, string> = {
  DRAFT: "bg-gradient-to-b from-gray-50 to-gray-100/30",
  SUBMITTED: "bg-gradient-to-b from-amber-50/20 to-gray-50",
  APPROVED: "bg-gradient-to-b from-emerald-50/20 to-gray-50",
  RETURNED: "bg-gradient-to-b from-red-50/20 to-gray-50",
};

const COLUMN_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  SUBMITTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  RETURNED: "bg-red-100 text-red-700",
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
      className={`flex flex-col rounded-lg border border-t-2 ${COLUMN_BG[status] || "bg-gray-50/80"} ${COLUMN_COLORS[status] || "border-t-gray-400"}`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200/60">
        <h3 className="text-[13px] font-semibold text-gray-700">
          {COLUMN_LABELS[status] || status}
        </h3>
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium ${COLUMN_BADGE[status] || "bg-gray-200 text-gray-600"}`}>
          {sheets.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-2 p-2 min-h-[200px] transition-all ${
              snapshot.isDraggingOver ? "bg-blue-50/50 ring-2 ring-blue-200 ring-inset rounded-b-lg" : ""
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
