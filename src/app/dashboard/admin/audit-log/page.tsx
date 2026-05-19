"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FilterBar, FilterSelect } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
} from "lucide-react";

interface AuditEntry {
  id: string;
  userId: string;
  user?: { name: string; email: string };
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string | null;
  newValue?: string | null;
  timestamp: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const ENTITY_TYPES = [
  "GoalCycle",
  "GoalSheet",
  "Goal",
  "QuarterlyAchievement",
  "User",
  "SharedGoal",
  "EscalationRule",
  "Escalation",
  "AppSettings",
];

export default function AuditLogPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);
  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (entityTypeFilter) params.set("entityType", entityTypeFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/audit-log?${params.toString()}`);
      if (res.ok) {
        const data: AuditResponse | AuditEntry[] = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
          setTotal(data.length);
        } else {
          setLogs(data.logs || []);
          setTotal(data.total || 0);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, entityTypeFilter, searchQuery]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchLogs();
    }
  }, [authStatus, router, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function formatJson(val: string | null | undefined): string {
    if (!val) return "-";
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  }

  function formatTimestamp(ts: string): string {
    const date = new Date(ts);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // Flatten log data for sorting
  const flatLogs = useMemo(() => {
    return logs.map((entry) => ({
      ...entry,
      _user: entry.user?.name || "System",
      _action: entry.action,
      _entity: entry.entityType,
      _date: entry.timestamp,
    }));
  }, [logs]);

  const { sortedData: sortedLogs, sortConfig, requestSort } = useSortable(flatLogs);

  if (authStatus === "loading") {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Audit Log" },
        ]}
        title="Audit Log"
        subtitle="Track all actions and changes across the system"
      />

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v);
          setPage(1);
        }}
        searchPlaceholder="Search by user, action, or entity..."
      >
        <FilterSelect
          value={entityTypeFilter}
          onChange={(v) => {
            setEntityTypeFilter(v);
            setPage(1);
          }}
          options={ENTITY_TYPES.map((et) => ({ value: et, label: et }))}
          placeholder="All Entity Types"
        />
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <Search className="h-3.5 w-3.5 mr-1" />
          Search
        </Button>
      </FilterBar>

      {loading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit log entries found"
          description="Adjust your search or filter criteria."
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Timestamp" sortKey="_date" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="User" sortKey="_user" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Action" sortKey="_action" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Entity" sortKey="_entity" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                  Entity ID
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3 w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLogs.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="py-2 px-3 text-[13px] text-gray-600 whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <div className="text-[13px] font-medium text-gray-900">
                      {entry.user?.name || "System"}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {entry.user?.email || entry.userId}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <StatusBadge status={entry.action} />
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                      {entry.entityType}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[11px] text-gray-400 font-mono">
                    {entry.entityId?.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDetailEntry(entry)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-200">
              <div className="text-[11px] text-gray-500">
                Page {page} of {totalPages} ({total} entries)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] text-gray-600 px-1">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Sheet (slide-in from right) */}
      <Sheet
        open={detailEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDetailEntry(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Log Detail</SheetTitle>
            <SheetDescription>
              Detailed view of this audit log entry.
            </SheetDescription>
          </SheetHeader>

          {detailEntry && (
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Timestamp
                  </div>
                  <div className="text-[13px] text-gray-900">
                    {formatTimestamp(detailEntry.timestamp)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    User
                  </div>
                  <div className="text-[13px] text-gray-900">
                    {detailEntry.user?.name || "System"}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {detailEntry.user?.email || ""}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Action
                  </div>
                  <StatusBadge status={detailEntry.action} />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Entity
                  </div>
                  <div className="text-[13px] text-gray-900">
                    {detailEntry.entityType}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                  Entity ID
                </div>
                <div className="text-[12px] font-mono text-gray-700 bg-gray-50 rounded-md px-2.5 py-1.5">
                  {detailEntry.entityId}
                </div>
              </div>

              {detailEntry.previousValue && (
                <div>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Previous Value
                  </div>
                  <pre className="text-[11px] text-gray-700 bg-red-50 border border-red-100 rounded-md p-2.5 overflow-x-auto whitespace-pre-wrap max-h-48">
                    {formatJson(detailEntry.previousValue)}
                  </pre>
                </div>
              )}

              {detailEntry.newValue && (
                <div>
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    New Value
                  </div>
                  <pre className="text-[11px] text-gray-700 bg-green-50 border border-green-100 rounded-md p-2.5 overflow-x-auto whitespace-pre-wrap max-h-48">
                    {formatJson(detailEntry.newValue)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
