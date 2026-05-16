"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ScrollText,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  FileText,
  Eye,
  X,
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

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700 border-green-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  APPROVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RETURN: "bg-amber-50 text-amber-700 border-amber-200",
  SUBMIT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  LOGIN: "bg-purple-50 text-purple-700 border-purple-200",
};

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

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track all actions and changes across the system
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, action, or entity..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchLogs();
              }}
              className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none appearance-none"
            >
              <option value="">All Entity Types</option>
              {ENTITY_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={fetchLogs}>
            <Search className="h-4 w-4 mr-1.5" />
            Search
          </Button>
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Timestamp
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      User
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Entity
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Entity ID
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-gray-500"
                    >
                      <ScrollText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      No audit log entries found
                    </td>
                  </tr>
                ) : (
                  logs.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {entry.user?.name || "System"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.user?.email || entry.userId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            ACTION_COLORS[entry.action] ||
                            "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {entry.entityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {entry.entityId?.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDetailEntry(entry)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} entries)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-700">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Audit Log Detail
              </h2>
              <button
                onClick={() => setDetailEntry(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Timestamp
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatTimestamp(detailEntry.timestamp)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    User
                  </div>
                  <div className="text-sm text-gray-900">
                    {detailEntry.user?.name || "System"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Action
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      ACTION_COLORS[detailEntry.action] ||
                      "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {detailEntry.action}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Entity
                  </div>
                  <div className="text-sm text-gray-900">
                    {detailEntry.entityType}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Entity ID
                </div>
                <div className="text-sm font-mono text-gray-700 bg-gray-50 rounded px-2 py-1">
                  {detailEntry.entityId}
                </div>
              </div>
              {detailEntry.previousValue && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Previous Value
                  </div>
                  <pre className="text-xs text-gray-700 bg-red-50 border border-red-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                    {formatJson(detailEntry.previousValue)}
                  </pre>
                </div>
              )}
              {detailEntry.newValue && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    New Value
                  </div>
                  <pre className="text-xs text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                    {formatJson(detailEntry.newValue)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
