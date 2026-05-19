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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  "#0052CC",
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

  // Burndown: cumulative goal completion over quarters
  const burndownData = (() => {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    let remaining = totalGoals;
    return quarters.map((q) => {
      const key = `${q.toLowerCase()}Score` as keyof ReportRow;
      const completed = reports.filter(
        (r) => (r[key] as number | undefined) != null && (r[key] as number) >= 80
      ).length;
      remaining = Math.max(0, remaining - completed);
      return {
        quarter: q,
        remaining,
        completed,
        ideal: Math.round(totalGoals - (totalGoals / 4) * quarters.indexOf(q) - totalGoals / 4),
      };
    });
  })();

  // Goal status distribution for funnel
  const statusDistribution = (() => {
    const empSheets = new Map<string, string>();
    reports.forEach((r) => {
      if (!empSheets.has(r.employeeId)) {
        const hasQ1 = r.q1Score != null && r.q1Score > 0;
        const hasQ2 = r.q2Score != null && r.q2Score > 0;
        const hasQ3 = r.q3Score != null && r.q3Score > 0;
        const hasQ4 = r.q4Score != null && r.q4Score > 0;
        const quartersComplete = [hasQ1, hasQ2, hasQ3, hasQ4].filter(Boolean).length;
        const status = quartersComplete === 0 ? "Not Started" : quartersComplete < 4 ? "In Progress" : "Completed";
        empSheets.set(r.employeeId, status);
      }
    });
    const counts = { "Not Started": 0, "In Progress": 0, "Completed": 0 };
    empSheets.forEach((s) => { counts[s as keyof typeof counts]++; });
    return [
      { name: "Not Started", value: counts["Not Started"], fill: "#94a3b8" },
      { name: "In Progress", value: counts["In Progress"], fill: "#3b82f6" },
      { name: "Completed", value: counts["Completed"], fill: "#10b981" },
    ];
  })();

  // Radar chart: department scores across thrust areas
  const radarData = (() => {
    const taSet = new Set<string>();
    reports.forEach((r) => { if (r.thrustArea) taSet.add(r.thrustArea); });
    const thrustAreas = Array.from(taSet).slice(0, 8);
    const depts = Array.from(new Set(reports.map((r) => r.department).filter(Boolean))).slice(0, 4);

    return thrustAreas.map((ta) => {
      const entry: Record<string, string | number> = { thrustArea: ta };
      depts.forEach((dept) => {
        const scores = reports
          .filter((r) => r.thrustArea === ta && r.department === dept && r.avgScore != null)
          .map((r) => r.avgScore!);
        entry[dept] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      });
      return entry;
    });
  })();

  const radarDepts = Array.from(new Set(reports.map((r) => r.department).filter(Boolean))).slice(0, 4);

  // Weightage distribution
  const weightageDistribution = (() => {
    const ranges = [
      { label: "10-20%", min: 10, max: 20 },
      { label: "21-30%", min: 21, max: 30 },
      { label: "31-40%", min: 31, max: 40 },
      { label: "41-50%", min: 41, max: 50 },
    ];
    return ranges.map((r) => ({
      range: r.label,
      count: reports.filter((rep) => rep.weightage >= r.min && rep.weightage <= r.max).length,
    }));
  })();

  // Employee score scatter (score vs weightage)
  const scatterData = (() => {
    const empMap = new Map<string, { name: string; dept: string; avgScore: number; totalWeight: number }>();
    reports.forEach((r) => {
      if (r.avgScore == null) return;
      const existing = empMap.get(r.employeeId);
      if (existing) {
        existing.avgScore = (existing.avgScore + r.avgScore) / 2;
        existing.totalWeight += r.weightage;
      } else {
        empMap.set(r.employeeId, {
          name: r.employeeName,
          dept: r.department,
          avgScore: r.avgScore,
          totalWeight: r.weightage,
        });
      }
    });
    return Array.from(empMap.values()).map((e) => ({
      name: e.name,
      department: e.dept,
      score: Math.round(e.avgScore),
      weightage: e.totalWeight,
    }));
  })();

  // Quarter-over-quarter velocity (rate of change)
  const velocityData = (() => {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const qAvgs = quarters.map((q) => {
      const key = `${q.toLowerCase()}Score` as keyof ReportRow;
      const scores = reports.map((r) => r[key] as number | undefined).filter((s) => s != null) as number[];
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });
    return quarters.map((q, i) => ({
      quarter: q,
      score: Math.round(qAvgs[i] * 10) / 10,
      velocity: i > 0 ? Math.round((qAvgs[i] - qAvgs[i - 1]) * 10) / 10 : 0,
    }));
  })();

  // Bottom performers (complement to top performers)
  const bottomPerformers = (() => {
    const empMap = new Map<string, { name: string; dept: string; scores: number[] }>();
    reports.forEach((r) => {
      if (r.avgScore == null) return;
      if (!empMap.has(r.employeeId))
        empMap.set(r.employeeId, { name: r.employeeName, dept: r.department, scores: [] });
      empMap.get(r.employeeId)!.scores.push(r.avgScore);
    });
    return Array.from(empMap.values())
      .map((e) => ({
        name: e.name,
        department: e.dept,
        avgScore: Math.round((e.scores.reduce((a, b) => a + b, 0) / e.scores.length) * 10) / 10,
      }))
      .filter((e) => e.avgScore > 0)
      .sort((a, b) => a.avgScore - b.avgScore)
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 animate-fade-in-up">
            <StatCard
              title="Total Goals"
              value={totalGoals}
              icon={Target}
              iconClassName="bg-blue-100"
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-2">
            {/* Quarterly Trend Line Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
                Quarterly Score Trend
              </h3>
              {quarterlyTrend.some((d) => d.avgScore > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={quarterlyTrend}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0052CC" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0052CC" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    <Area
                      type="monotone"
                      dataKey="avgScore"
                      stroke="#0052CC"
                      strokeWidth={2.5}
                      fill="url(#lineGrad)"
                      dot={{
                        r: 5,
                        fill: "#0052CC",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 7 }}
                      name="Avg Score (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">
                  No quarterly data available
                </div>
              )}
            </div>

            {/* Completion Distribution Pie Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
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
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
                Department Performance
              </h3>
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={departmentData} layout="vertical">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0052CC" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0052CC" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
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
                      fill="url(#barGrad)"
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
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
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

          {/* Row 3: Burndown + Goal Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-3">
            {/* Burndown Chart */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Goal Burndown Chart
              </h3>
              {burndownData.some((d) => d.remaining > 0 || d.completed > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={burndownData}>
                    <defs>
                      <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="idealGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area type="monotone" dataKey="remaining" stroke="#ef4444" strokeWidth={2.5} fill="url(#burnGrad)" name="Remaining" dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }} />
                    <Area type="monotone" dataKey="ideal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" fill="url(#idealGrad)" name="Ideal" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">No burndown data available</div>
              )}
            </div>

            {/* Goal Status Funnel */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Employee Progress Status
              </h3>
              {statusDistribution.some((d) => d.value > 0) ? (
                <div className="space-y-6 pt-4">
                  {statusDistribution.map((item) => {
                    const totalEmployees = statusDistribution.reduce((s, d) => s + d.value, 0);
                    const pct = totalEmployees > 0 ? (item.value / totalEmployees) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                          </div>
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{item.value} <span className="text-gray-400 font-normal">({Math.round(pct)}%)</span></span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.fill }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-center gap-6 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {statusDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-[11px] text-gray-500">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">No status data available</div>
              )}
            </div>
          </div>

          {/* Row 4: Radar + Velocity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-4">
            {/* Radar Chart: Department x Thrust Area */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Department vs Thrust Area Radar
              </h3>
              {radarData.length > 0 && radarDepts.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="thrustArea" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
                    {radarDepts.map((dept, i) => (
                      <Radar key={dept} name={dept} dataKey={dept} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[320px] text-gray-400 text-[13px]">Not enough data for radar view</div>
              )}
            </div>

            {/* Score Velocity Chart */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Score Velocity (Quarter-over-Quarter)
              </h3>
              {velocityData.some((d) => d.score > 0) ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={velocityData}>
                    <defs>
                      <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="score" fill="url(#velGrad)" radius={[4, 4, 0, 0]} name="Avg Score (%)" />
                    <Line type="monotone" dataKey="velocity" stroke="#f59e0b" strokeWidth={2.5} name="Velocity (change)" dot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[320px] text-gray-400 text-[13px]">No velocity data available</div>
              )}
            </div>
          </div>

          {/* Row 5: Scatter + Weightage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-5">
            {/* Scatter Plot: Score vs Weightage */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Employee Score vs Goal Weightage
              </h3>
              {scatterData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" dataKey="weightage" name="Weightage" tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Total Weightage", position: "insideBottom", offset: -5, fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis type="number" dataKey="score" name="Score" domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Avg Score %", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9ca3af" }} />
                    <ZAxis range={[60, 200]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value, name) => [name === "Score" ? `${value}%` : value, name]} />
                    <Scatter name="Employees" data={scatterData} fill="#0052CC">
                      {scatterData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">No scatter data available</div>
              )}
            </div>

            {/* Weightage Distribution */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Goal Weightage Distribution
              </h3>
              {weightageDistribution.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weightageDistribution}>
                    <defs>
                      <linearGradient id="wgtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Bar dataKey="count" fill="url(#wgtGrad)" radius={[4, 4, 0, 0]} name="Goals Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-[13px]">No weightage data available</div>
              )}
            </div>
          </div>

          {/* Row 6: Top + Bottom Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up stagger-6">
            {/* Top Performers */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Top Performers
              </h3>
              {topPerformers.length > 0 ? (
                <div className="space-y-2.5">
                  {topPerformers.map((performer, idx) => (
                    <div key={performer.name} className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-gray-100 text-gray-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-500"}`}>
                        {idx + 1}
                      </div>
                      <UserAvatar name={performer.name} size="xs" />
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{performer.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(performer.avgScore, 100)}%` }} />
                        </div>
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 w-12 text-right">{performer.avgScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-[13px]">No performer data available</div>
              )}
            </div>

            {/* Bottom Performers (Needs Attention) */}
            <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Needs Attention
              </h3>
              {bottomPerformers.length > 0 ? (
                <div className="space-y-2.5">
                  {bottomPerformers.map((performer, idx) => (
                    <div key={performer.name} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[11px] font-bold">
                        {idx + 1}
                      </div>
                      <UserAvatar name={performer.name} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{performer.name}</div>
                        <div className="text-[11px] text-gray-400">{performer.department}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-red-500 to-amber-400 rounded-full transition-all" style={{ width: `${Math.min(performer.avgScore, 100)}%` }} />
                        </div>
                        <span className="text-[13px] font-semibold text-red-600 dark:text-red-400 w-12 text-right">{performer.avgScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-[13px]">No data available</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
