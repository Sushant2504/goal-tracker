"use client";

import { useEffect, useState, useCallback } from "react";
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
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { FilterBar, FilterSelect } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import { ActiveFilters } from "@/components/shared/ActiveFilters";
import {
  Download,
  Loader2,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

interface ReportRow {
  employeeId: string;
  employeeName: string;
  department: string;
  goalTitle: string;
  thrustArea: string;
  target: number;
  uomType: string;
  weightage: number;
  q1Actual?: number;
  q2Actual?: number;
  q3Actual?: number;
  q4Actual?: number;
  q1Score?: number;
  q2Score?: number;
  q3Score?: number;
  q4Score?: number;
  avgScore?: number;
}

interface Cycle {
  id: string;
  name: string;
  status: string;
}

function scoreColor(score: number | undefined | null): string {
  if (score == null) return "";
  if (score >= 80) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

function scoreBg(score: number | undefined | null): string {
  if (score == null) return "";
  if (score >= 80) return "bg-emerald-50";
  if (score >= 50) return "bg-amber-50";
  return "bg-red-50";
}

export default function ReportsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cycleFilter, setCycleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cycles");
      if (res.ok) {
        const data = await res.json();
        setCycles(Array.isArray(data) ? data : []);
        if (data.length > 0 && !cycleFilter) {
          const active = data.find((c: Cycle) => c.status === "ACTIVE");
          setCycleFilter(active?.id || data[0].id);
        }
      }
    } catch {
      // silent
    }
  }, [cycleFilter]);

  const fetchReports = useCallback(async () => {
    if (!cycleFilter) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ cycleId: cycleFilter });
      if (departmentFilter) params.set("department", departmentFilter);
      if (quarterFilter) params.set("quarter", quarterFilter);
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [cycleFilter, departmentFilter, quarterFilter]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchCycles();
    }
  }, [authStatus, router, fetchCycles]);

  useEffect(() => {
    if (cycleFilter) fetchReports();
  }, [cycleFilter, departmentFilter, quarterFilter, fetchReports]);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ cycleId: cycleFilter });
      if (departmentFilter) params.set("department", departmentFilter);
      if (quarterFilter) params.set("quarter", quarterFilter);
      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${cycleFilter}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report exported");
      } else {
        toast.error("Failed to export report");
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const filtered = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.goalTitle?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.thrustArea?.toLowerCase().includes(q)
    );
  });

  const { sortedData: sortedFiltered, sortConfig, requestSort } = useSortable<ReportRow>(filtered);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const paged = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);

  const uniqueEmployees = new Set(reports.map((r) => r.employeeId)).size;
  const avgCompletion =
    reports.length > 0
      ? (
          reports.reduce((sum, r) => sum + (r.avgScore || 0), 0) /
          reports.length
        ).toFixed(1)
      : "0";
  const departments = [
    ...new Set(reports.map((r) => r.department).filter(Boolean)),
  ];

  if (authStatus === "loading") {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
        ]}
        title="Achievement Reports"
        subtitle="View achievement data across employees, departments, and quarters"
        actions={
          <Button
            onClick={handleExport}
            disabled={exporting || !cycleFilter}
            variant="outline"
            size="sm"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1" />
            )}
            Export Excel
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Goals"
          value={reports.length}
          icon={Target}
          iconClassName="bg-blue-100"
        />
        <StatCard
          title="Avg Completion"
          value={`${avgCompletion}%`}
          icon={TrendingUp}
          iconClassName="bg-emerald-100"
        />
        <StatCard
          title="Employees"
          value={uniqueEmployees}
          icon={Users}
          iconClassName="bg-blue-100"
        />
        <StatCard
          title="Departments"
          value={departments.length}
          icon={BarChart3}
          iconClassName="bg-amber-100"
        />
      </div>

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v);
          setPage(1);
        }}
        searchPlaceholder="Search by employee, goal, department..."
      >
        <FilterSelect
          value={cycleFilter}
          onChange={(v) => {
            setCycleFilter(v);
            setPage(1);
          }}
          options={cycles.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select Cycle"
        />
        <FilterSelect
          value={departmentFilter}
          onChange={(v) => {
            setDepartmentFilter(v);
            setPage(1);
          }}
          options={departments.map((d) => ({ value: d, label: d }))}
          placeholder="All Departments"
        />
        <FilterSelect
          value={quarterFilter}
          onChange={(v) => {
            setQuarterFilter(v);
            setPage(1);
          }}
          options={[
            { value: "Q1", label: "Q1" },
            { value: "Q2", label: "Q2" },
            { value: "Q3", label: "Q3" },
            { value: "Q4", label: "Q4" },
          ]}
          placeholder="All Quarters"
        />
      </FilterBar>

      <ActiveFilters
        filters={[
          ...(departmentFilter
            ? [
                {
                  key: "department",
                  label: "Department",
                  value: departmentFilter,
                  onRemove: () => {
                    setDepartmentFilter("");
                    setPage(1);
                  },
                },
              ]
            : []),
          ...(quarterFilter
            ? [
                {
                  key: "quarter",
                  label: "Quarter",
                  value: quarterFilter,
                  onRemove: () => {
                    setQuarterFilter("");
                    setPage(1);
                  },
                },
              ]
            : []),
          ...(searchQuery
            ? [
                {
                  key: "search",
                  label: "Search",
                  value: searchQuery,
                  onRemove: () => {
                    setSearchQuery("");
                    setPage(1);
                  },
                },
              ]
            : []),
        ]}
        onClearAll={() => {
          setDepartmentFilter("");
          setQuarterFilter("");
          setSearchQuery("");
          setPage(1);
        }}
      />

      {loading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No report data found"
          description="Select a cycle or adjust filters to view reports."
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Employee" sortKey="employeeName" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Dept" sortKey="department" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Goal" sortKey="goalTitle" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Target" sortKey="weightage" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3 text-center">
                  <SortableHeader label="Q1" sortKey="q1Score" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3 text-center">
                  <SortableHeader label="Q2" sortKey="q2Score" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3 text-center">
                  <SortableHeader label="Q3" sortKey="q3Score" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3 text-center">
                  <SortableHeader label="Q4" sortKey="q4Score" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3 text-center">
                  <SortableHeader label="Avg" sortKey="avgScore" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row, idx) => (
                <TableRow key={`${row.employeeId}-${idx}`}>
                  <TableCell className="py-2 px-3 text-[13px] font-medium text-gray-900">
                    {row.employeeName}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[13px] text-gray-600">
                    {row.department}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <div className="text-[13px] text-gray-900">
                      {row.goalTitle}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {row.thrustArea}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[13px] text-gray-600">
                    {row.target}
                    {row.uomType === "PERCENTAGE" ? "%" : ""}
                  </TableCell>
                  {(["q1", "q2", "q3", "q4"] as const).map((q) => {
                    const score = row[`${q}Score` as keyof ReportRow] as
                      | number
                      | undefined;
                    const actual = row[`${q}Actual` as keyof ReportRow] as
                      | number
                      | undefined;
                    return (
                      <TableCell
                        key={q}
                        className="py-2 px-3 text-center"
                      >
                        {actual != null ? (
                          <div>
                            <div className="text-[13px] font-medium text-gray-900">
                              {actual}
                            </div>
                            {score != null && (
                              <div
                                className={`text-[11px] font-medium ${scoreColor(score)}`}
                              >
                                {score.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="py-2 px-3 text-center">
                    {row.avgScore != null ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${scoreBg(row.avgScore)} ${scoreColor(row.avgScore)}`}
                      >
                        {row.avgScore.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-200">
              <div className="text-[11px] text-gray-500">
                Showing {(page - 1) * pageSize + 1}
                {" - "}
                {Math.min(page * pageSize, sortedFiltered.length)} of{" "}
                {sortedFiltered.length}
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
    </div>
  );
}
