"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileEdit, Send, CheckCircle, RotateCcw, Play, Lock, Circle,
  TrendingUp, AlertTriangle, Clock, CheckCircle2, Shield, Users,
  User, Plus, Pencil, Trash2,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RETURNED: "bg-red-50 text-red-700 border-red-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-gray-100 text-gray-500 border-gray-200",
  OPEN: "bg-red-50 text-red-700 border-red-200",
  ACKNOWLEDGED: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOT_STARTED: "bg-gray-100 text-gray-600 border-gray-200",
  ON_TRACK: "bg-blue-50 text-blue-700 border-blue-200",
  AT_RISK: "bg-amber-50 text-amber-700 border-amber-200",
  DELAYED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
  EMPLOYEE: "bg-gray-100 text-gray-700 border-gray-200",
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  APPROVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RETURN: "bg-amber-50 text-amber-700 border-amber-200",
  SUBMIT: "bg-blue-50 text-blue-700 border-blue-200",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  DRAFT: FileEdit,
  SUBMITTED: Send,
  APPROVED: CheckCircle,
  RETURNED: RotateCcw,
  ACTIVE: Play,
  CLOSED: Lock,
  OPEN: AlertTriangle,
  ACKNOWLEDGED: Clock,
  RESOLVED: CheckCircle2,
  NOT_STARTED: Circle,
  ON_TRACK: TrendingUp,
  AT_RISK: AlertTriangle,
  DELAYED: Clock,
  COMPLETED: CheckCircle2,
  ADMIN: Shield,
  MANAGER: Users,
  EMPLOYEE: User,
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  APPROVE: CheckCircle,
  RETURN: RotateCcw,
  SUBMIT: Send,
};

const LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-700 border-gray-200";
  const label = LABELS[status] || status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  const StatusIcon = STATUS_ICONS[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded-md border inline-flex items-center gap-1",
        style,
        className
      )}
    >
      {StatusIcon && <StatusIcon className="h-3 w-3 shrink-0" />}
      {label}
    </Badge>
  );
}
