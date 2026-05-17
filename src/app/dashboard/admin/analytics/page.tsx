"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { FilterSelect } from "@/components/shared/FilterBar";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  TrendingUp,
  Users,
  Target,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Cycle {
  id: string;
  name: string;
  status: string;
}

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

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
];

export default function AnalyticsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [cycleFilter, setCycleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cycles");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setCycles(arr);
        if (arr.length > 0 && !cycleFilter) {
          const active = arr.find((c: Cycle) => c.status === "ACTIVE");
          setCycleFilter(active?.id || arr[0].id);
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
      const res = await fetch(`/api/reports?cycleId=${cycleFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [cycleFilter]);

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
  }, [cycleFilter, fetchReports]);

  // Compute chart data
  const quarterlyTrend = (() => {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    return quarters.map((q) => {
      const key = `${q.toLowerCase()}Score` as keyof ReportRow;
      const scores = reports
        .map((r) => r[key] as number | undefined)
        .filter((s) => s != null) as number[];
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      return { quarter: q, avgScore: Math.round(avg * 10) / 10 };
    });
  })();

  const departmentData = (() => {
    const deptMap = new Map<string, number[]>();
    reports.forEach((r) => {
      if (!r.department || r.avgScore == null) return;
      if (!deptMap.has(r.department)) deptMap.set(r.department, []);
      deptMap.get(r.department)!.push(r.avgScore);
    });
    return Array.from(deptMap.entries()).map(([dept, scores]) => ({
      department: dept,
      avgScore:
        Math.round(
          (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
        ) / 10,
      count: scores.length,
    }));
  })();

  const completionDistribution = (() => {
    const ranges = [
      { name: "Excellent (90-100%)", min: 90, max: 101 },
      { name: "Good (70-89%)", min: 70, max: 90 },
      { name: "Average (50-69%)", min: 50, max: 70 },
      { name: "Below (30-49%)", min: 30, max: 50 },
      { name: "Poor (<30%)", min: 0, max: 30 },
    ];
    return ranges
      .map((range) => ({
        name: range.name,
        value: reports.filter(
          (r) =>
            r.avgScore != null &&
            r.avgScore >= range.min &&
            r.avgScore < range.max
        ).length,
      }))
      .filter((d) => d.value > 0);
  })();

  const thrustAreaData = (() => {
    const taMap = new Map<string, number[]>();
    reports.forEach((r) => {
      if (!r.thrustArea || r.avgScore == null) return;
      if (!taMap.has(r.thrustArea)) taMap.set(r.thrustArea, []);
      taMap.get(r.thrustArea)!.push(r.avgScore);
    });
    return Array.from(taMap.entries())
      .map(([area, scores]) => ({
        thrustArea: area,
        avgScore:
          Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10,
        count: scores.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  })();

  const totalGoals = reports.length;
  const uniqueEmployees = new Set(reports.map((r) => r.employeeId)).size;
  const overallAvg =
    reports.length > 0
      ? Math.round(
          (reports.reduce((s, r) => s + (r.avgScore || 0), 0) /
            reports.length) *
            10
        ) / 10
      : 0;
  const topPerformers = (() => {
    const empMap = new Map<string, { name: string; scores: number[] }>();
    reports.forEach((r) => {
      if (r.avgScore == null) return;
      if (!empMap.has(r.employeeId))
        empMap.set(r.employeeId, { name: r.employeeName, scores: [] });
      empMap.get(r.employeeId)!.scores.push(r.avgScore);
    });
    return Array.from(empMap.values())
      .map((e) => ({
        name: e.name,
        avgScore:
          Math.round(
            (e.scores.reduce((a, b) => a + b, 0) / e.scores.length) * 10
          ) / 10,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);
  })();

  if (authStatus === "loading") {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analytics" },
        ]}
        title="Analytics Dashboard"
        subtitle="Visual insights into goal performance across the organization"
        actions={
          <FilterSelect
            value={cycleFilter}
            onChange={setCycleFilter}
            options={cycles.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select Cycle"
          />
        }
      />

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <StatCard
              title="Total Goals"
              value={totalGoals}
              icon={Target}
              iconClassName="bg-indigo-100"
            />
            <StatCard
              title="Overall Avg Score"
              value={`${overallAvg}%`}
              icon={TrendingUp}
              iconClassName="bg-emerald-100"
            />
            <StatCard
              title="Employees"
              value={uniqueEmployees}
              icon={Users}
              iconClassName="bg-violet-100"
            />
            <StatCard
              title="Departments"
              value={departmentData.length}
              icon={Award}
              iconClassName="bg-amber-100"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quarterly Trend Line Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
                Quarterly Score Trend
              </h3>
              {quarterlyTrend.some((d) => d.avgScore > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={quarterlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="quarter"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{
                        r: 5,
                        fill: "#6366f1",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 7 }}
                      name="Avg Score (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">
                  No quarterly data available
                </div>
              )}
            </div>

            {/* Completion Distribution Pie Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
                Completion Distribution
              </h3>
              {completionDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={completionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({
                        name,
                        percent,
                      }: {
                        name?: string;
                        percent?: number;
                      }) =>
                        `${(name ?? "").split(" ")[0]} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {completionDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">
                  No completion data available
                </div>
              )}
            </div>

            {/* Department Performance Bar Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
                Department Performance
              </h3>
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={departmentData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="department"
                      width={110}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="avgScore"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                      name="Avg Score (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">
                  No department data available
                </div>
              )}
            </div>

            {/* Thrust Area Performance */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
                Top Thrust Areas by Performance
              </h3>
              {thrustAreaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={thrustAreaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="thrustArea"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      angle={-20}
                      textAnchor="end"
                      height={55}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="avgScore"
                      radius={[4, 4, 0, 0]}
                      name="Avg Score (%)"
                    >
                      {thrustAreaData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">
                  No thrust area data available
                </div>
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
              Top Performers
            </h3>
            {topPerformers.length > 0 ? (
              <div className="space-y-2.5">
                {topPerformers.map((performer, idx) => (
                  <div
                    key={performer.name}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        idx === 0
                          ? "bg-amber-100 text-amber-700"
                          : idx === 1
                            ? "bg-gray-100 text-gray-600"
                            : idx === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <UserAvatar name={performer.name} size="xs" />
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-gray-900">
                        {performer.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(performer.avgScore, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-900 w-12 text-right">
                        {performer.avgScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-[13px]">
                No performer data available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
