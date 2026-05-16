"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Download,
  Loader2,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
      }
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }

  // Client-side search
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Dashboard cards
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Achievement Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View achievement data across employees, departments, and quarters
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || !cycleFilter}
          variant="outline"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Download className="h-4 w-4 mr-1.5" />
          )}
          Export Excel
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Target className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {reports.length}
              </div>
              <div className="text-xs text-gray-500">Total Goals</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {avgCompletion}%
              </div>
              <div className="text-xs text-gray-500">Avg Completion</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {uniqueEmployees}
              </div>
              <div className="text-xs text-gray-500">Employees</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {departments.length}
              </div>
              <div className="text-xs text-gray-500">Departments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee, goal, department..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={cycleFilter}
              onChange={(e) => {
                setCycleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="">Select Cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={quarterFilter}
              onChange={(e) => {
                setQuarterFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="">All Quarters</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
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
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Goal
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Target
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Q1
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Q2
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Q3
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Q4
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Avg Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-12 text-gray-500"
                    >
                      <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      No report data found
                    </td>
                  </tr>
                ) : (
                  paged.map((row, idx) => (
                    <tr
                      key={`${row.employeeId}-${idx}`}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.employeeName}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.department}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-gray-900">{row.goalTitle}</div>
                          <div className="text-xs text-gray-500">
                            {row.thrustArea}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.target} {row.uomType === "PERCENTAGE" ? "%" : ""}
                      </td>
                      {(["q1", "q2", "q3", "q4"] as const).map((q) => {
                        const score = row[`${q}Score` as keyof ReportRow] as
                          | number
                          | undefined;
                        const actual = row[`${q}Actual` as keyof ReportRow] as
                          | number
                          | undefined;
                        return (
                          <td key={q} className="px-4 py-3 text-center">
                            {actual != null ? (
                              <div>
                                <div className="font-medium text-gray-900">
                                  {actual}
                                </div>
                                {score != null && (
                                  <div
                                    className={`text-xs ${score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}
                                  >
                                    {score.toFixed(0)}%
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        {row.avgScore != null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              row.avgScore >= 80
                                ? "bg-green-50 text-green-700"
                                : row.avgScore >= 50
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {row.avgScore.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
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
                Showing {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length}
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
                  Page {page} of {totalPages}
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
    </div>
  );
}
