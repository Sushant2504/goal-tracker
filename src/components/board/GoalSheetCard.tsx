"use client";

import { Draggable } from "@hello-pangea/dnd";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface GoalSheetCardData {
  id: string;
  status: string;
  updatedAt: string;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string | null;
  };
  cycle: {
    id: string;
    name: string;
    status: string;
  };
  goals: { id: string; title: string; weightage: number }[];
  approvedBy: { id: string; name: string } | null;
}

interface GoalSheetCardProps {
  sheet: GoalSheetCardData;
  index: number;
  onClick: (sheetId: string) => void;
}

export function GoalSheetCard({ sheet, index, onClick }: GoalSheetCardProps) {
  return (
    <Draggable draggableId={sheet.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(sheet.id)}
          className={`rounded-md border bg-white p-2.5 text-[13px] cursor-pointer transition-shadow hover:shadow-sm ${
            snapshot.isDragging ? "shadow-md ring-2 ring-indigo-200" : ""
          }`}
        >
          <div className="flex items-start gap-2">
            <UserAvatar name={sheet.employee.name} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate leading-tight">
                {sheet.employee.name}
              </p>
              {sheet.employee.department && (
                <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                  {sheet.employee.department}
                </p>
              )}
            </div>
            <StatusBadge status={sheet.status} />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Target className="h-3 w-3" />
              <span>
                {sheet.goals.length} goal{sheet.goals.length !== 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              {formatDistanceToNow(new Date(sheet.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
