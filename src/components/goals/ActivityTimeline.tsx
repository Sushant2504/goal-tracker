"use client";

import {
  Plus,
  Pencil,
  Send,
  CheckCircle,
  RotateCcw,
  Trash2,
  MessageSquare,
  Activity as ActivityIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string | null;
  newValue: string | null;
  timestamp: string;
  user: { name: string };
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE: Plus,
  UPDATE: Pencil,
  UPDATE_GOALS: Pencil,
  UPDATE_STATUS: Pencil,
  SUBMIT: Send,
  APPROVE: CheckCircle,
  RETURN: RotateCcw,
  DELETE: Trash2,
  COMMENT: MessageSquare,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-600",
  UPDATE: "bg-blue-100 text-blue-600",
  UPDATE_GOALS: "bg-blue-100 text-blue-600",
  UPDATE_STATUS: "bg-blue-100 text-blue-600",
  SUBMIT: "bg-blue-100 text-blue-600",
  APPROVE: "bg-emerald-100 text-emerald-600",
  RETURN: "bg-amber-100 text-amber-600",
  DELETE: "bg-red-100 text-red-600",
  COMMENT: "bg-gray-100 text-gray-600",
};

function getActionDescription(action: string, userName: string): string {
  switch (action) {
    case "CREATE":
      return `${userName} created this goal sheet`;
    case "UPDATE":
    case "UPDATE_GOALS":
      return `${userName} updated goals`;
    case "UPDATE_STATUS":
      return `${userName} changed the status`;
    case "SUBMIT":
      return `${userName} submitted for approval`;
    case "APPROVE":
      return `${userName} approved the goal sheet`;
    case "RETURN":
      return `${userName} returned for revision`;
    case "DELETE":
      return `${userName} deleted the goal sheet`;
    case "COMMENT":
      return `${userName} added a comment`;
    default:
      return `${userName} performed ${action.toLowerCase()}`;
  }
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <ActivityIcon className="h-8 w-8 mb-2" />
        <p className="text-[13px]">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gray-200" />

      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = ACTION_ICONS[activity.action] || ActivityIcon;
          const colorClass =
            ACTION_COLORS[activity.action] || "bg-gray-100 text-gray-600";

          return (
            <div key={activity.id} className="relative flex gap-2.5 pl-0">
              <div
                className={`relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${colorClass}`}
              >
                <Icon className="h-3 w-3" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[13px] text-gray-700 leading-snug">
                  {getActionDescription(activity.action, activity.user.name)}
                </p>

                {activity.action === "COMMENT" && activity.newValue && (
                  <p className="mt-0.5 text-[12px] text-gray-500 bg-gray-50 rounded px-2 py-1 break-words">
                    {(() => {
                      try {
                        const parsed = JSON.parse(activity.newValue);
                        return typeof parsed === "string" ? parsed : activity.newValue;
                      } catch {
                        return activity.newValue;
                      }
                    })()}
                  </p>
                )}

                <p className="text-[11px] text-gray-400 mt-0.5">
                  {formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
