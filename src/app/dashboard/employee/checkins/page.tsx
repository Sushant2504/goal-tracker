"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Save,
  AlertCircle,
  ChevronDown,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  computeScore,
  getWeightedScore,
  getUomLabel,
  formatTarget,
} from "@/lib/scoring";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "DELAYED", label: "Delayed" },
  { value: "COMPLETED", label: "Completed" },
];

function getScoreColor(score: number | null) {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function getScoreBgColor(score: number | null) {
  if (score === null) return "bg-gray-100";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

interface Goal {
  id: string;
  title: string;
  thrustArea: string;
  uomType: string;
  target: string;
  weightage: number;
  sortOrder: number;
}

interface Achievement {
  id?: string;
  goalId: string;
  quarter: string;
  actualValue: string | null;
  status: string;
  computedScore: number | null;
}

interface GoalSheet {
  id: string;
  employeeId: string;
  status: string;
  cycle: { id: string; name: string };
  goals: Goal[];
}

interface CheckIn {
  id: string;
  quarter: string;
  employeeNotes: string | null;
  managerComment: string | null;
  checkedInAt: string;
  manager: { id: string; name: string };
}

interface GoalCycle {
  id: string;
  name: string;
  status: string;
}

export default function EmployeeCheckinsPage() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [goalSheet, setGoalSheet] = useState<GoalSheet | null>(null);
  const [achievements, setAchievements] = useState<
    Record<string, Achievement>
  >({});
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);

  // Load data
  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadData() {
      try {
        // Get active cycle
        const cycleRes = await fetch("/api/admin/cycles");
        if (!cycleRes.ok) throw new Error("Failed to load cycles");
        const cycles: GoalCycle[] = await cycleRes.json();
        const active = cycles.find((c) => c.status === "ACTIVE");
        if (!active) {
          setLoading(false);
          return;
        }

        // Get my goal sheets
        const sheetsRes = await fetch(
          `/api/goal-sheets?cycleId=${active.id}`
        );
        if (!sheetsRes.ok) throw new Error("Failed to load goal sheets");
        const sheets: GoalSheet[] = await sheetsRes.json();
        const mySheet = sheets.find(
          (s) => s.employeeId === session!.user.id
        );

        if (!mySheet) {
          setLoading(false);
          return;
        }

        // Get full sheet with goals
        const fullRes = await fetch(`/api/goal-sheets/${mySheet.id}`);
        if (!fullRes.ok) throw new Error("Failed to load goal sheet");
        const fullSheet: GoalSheet = await fullRes.json();
        setGoalSheet(fullSheet);
      } catch (err) {
        console.error("Load error:", err);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user?.id]);

  // Load achievements and check-in for selected quarter
  useEffect(() => {
    if (!goalSheet) return;

    async function loadQuarterData() {
      try {
        // Load achievements
        const achRes = await fetch(
          `/api/achievements?goalSheetId=${goalSheet!.id}&quarter=${selectedQuarter}`
        );
        if (achRes.ok) {
          const achData: Achievement[] = await achRes.json();
          const achMap: Record<string, Achievement> = {};
          achData.forEach((a) => {
            achMap[a.goalId] = a;
          });
          // Fill in missing goals with defaults
          goalSheet!.goals.forEach((g) => {
            if (!achMap[g.id]) {
              achMap[g.id] = {
                goalId: g.id,
                quarter: selectedQuarter,
                actualValue: null,
                status: "NOT_STARTED",
                computedScore: null,
              };
            }
          });
          setAchievements(achMap);
        }

        // Load check-in
        const ciRes = await fetch(
          `/api/checkins?goalSheetId=${goalSheet!.id}&quarter=${selectedQuarter}`
        );
        if (ciRes.ok) {
          const ciData: CheckIn[] = await ciRes.json();
          if (ciData.length > 0) {
            setCheckIn(ciData[0]);
            setEmployeeNotes(ciData[0].employeeNotes || "");
          } else {
            setCheckIn(null);
            setEmployeeNotes("");
          }
        }
      } catch (err) {
        console.error("Load quarter data error:", err);
      }
    }

    loadQuarterData();
  }, [goalSheet, selectedQuarter]);

  function updateAchievement(
    goalId: string,
    field: "actualValue" | "status",
    value: string
  ) {
    setAchievements((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value || null,
      },
    }));
  }

  async function handleSave() {
    if (!goalSheet) return;
    setSaving(true);

    try {
      // Save achievements
      const achPayload = Object.values(achievements)
        .filter((a) => a.actualValue !== null || a.status !== "NOT_STARTED")
        .map((a) => ({
          goalId: a.goalId,
          quarter: selectedQuarter,
          actualValue: a.actualValue,
          status: a.status,
        }));

      if (achPayload.length > 0) {
        const achRes = await fetch("/api/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ achievements: achPayload }),
        });

        if (!achRes.ok) {
          const data = await achRes.json();
          throw new Error(data.error || "Failed to save achievements");
        }

        // Update achievements with computed scores from response
        const achResults = await achRes.json();
        const updatedMap: Record<string, Achievement> = { ...achievements };
        achResults.forEach(
          (r: Achievement & { goal: { id: string } }) => {
            updatedMap[r.goalId || r.goal?.id] = {
              ...updatedMap[r.goalId || r.goal?.id],
              computedScore: r.computedScore,
            };
          }
        );
        setAchievements(updatedMap);
      }

      // Save check-in notes
      if (employeeNotes.trim()) {
        const ciRes = await fetch("/api/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalSheetId: goalSheet.id,
            quarter: selectedQuarter,
            employeeNotes: employeeNotes.trim(),
          }),
        });

        if (!ciRes.ok) {
          const data = await ciRes.json();
          throw new Error(data.error || "Failed to save check-in");
        }

        const ciData = await ciRes.json();
        setCheckIn(ciData);
      }

      toast.success("Check-in saved successfully!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // Compute scores for display
  function getGoalScore(goal: Goal): number | null {
    const ach = achievements[goal.id];
    if (!ach?.actualValue) return null;
    return computeScore(goal.uomType, goal.target, ach.actualValue);
  }

  function getOverallScore(): number {
    if (!goalSheet) return 0;
    return goalSheet.goals.reduce((sum, goal) => {
      const score = getGoalScore(goal);
      return sum + getWeightedScore(score, goal.weightage);
    }, 0);
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (!goalSheet) {
    return (
      <div className="space-y-1">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Check-ins" },
          ]}
          title="Check-ins"
        />
        <EmptyState
          icon={AlertCircle}
          title="No Goal Sheet Found"
          description="You need an active goal sheet before you can add check-ins. Please create and submit your goals first."
        />
      </div>
    );
  }

  if (goalSheet.status !== "APPROVED") {
    return (
      <div className="space-y-1">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Check-ins" },
          ]}
          title="Check-ins"
        />
        <EmptyState
          icon={Info}
          title="Goals Not Yet Approved"
          description={`Check-ins can only be entered once your goal sheet has been approved by your manager. Current status: ${goalSheet.status}`}
        />
      </div>
    );
  }

  const overallScore = getOverallScore();

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Check-ins" },
        ]}
        title="Quarterly Check-ins"
        subtitle={`${goalSheet.cycle.name} · Track progress against approved goals`}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Saving..." : "Save Check-in"}
          </Button>
        }
      />

      {/* Quarter tabs */}
      <Tabs
        value={selectedQuarter}
        onValueChange={(value) => setSelectedQuarter(value as string)}
      >
        <TabsList>
          {QUARTERS.map((q) => (
            <TabsTrigger key={q} value={q}>
              {q}
            </TabsTrigger>
          ))}
        </TabsList>

        {QUARTERS.map((q) => (
          <TabsContent key={q} value={q}>
            {selectedQuarter === q && (
              <div className="space-y-4 mt-1">
                {/* Overall score - compact */}
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-100">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                        Overall Weighted Score - {selectedQuarter}
                      </p>
                      <p
                        className={`text-xl font-bold ${getScoreColor(overallScore)}`}
                      >
                        {overallScore.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreBgColor(overallScore)}`}
                        style={{ width: `${Math.min(overallScore, 100)}%` }}
                      />
                    </div>
                    <span className={`text-[13px] font-semibold tabular-nums ${getScoreColor(overallScore)}`}>
                      {overallScore.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Goals table */}
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                          <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                            Goal
                          </th>
                          <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide w-24">
                            Target
                          </th>
                          <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide w-32">
                            Actual
                          </th>
                          <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide w-32">
                            Status
                          </th>
                          <th className="text-center px-3 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide w-16">
                            Score
                          </th>
                          <th className="text-center px-3 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide w-20">
                            Weighted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {goalSheet.goals
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((goal) => {
                            const ach = achievements[goal.id];
                            const score = getGoalScore(goal);
                            const weighted = getWeightedScore(score, goal.weightage);

                            return (
                              <tr key={goal.id} className="hover:bg-gray-50/50">
                                <td className="px-3 py-2">
                                  <div>
                                    <p className="text-[13px] font-medium text-gray-900">
                                      {goal.title}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                      {goal.thrustArea} · {getUomLabel(goal.uomType)} · {goal.weightage}%
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="text-[13px] text-gray-700">
                                    {formatTarget(goal.uomType, goal.target)}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type={
                                      goal.uomType === "TIMELINE" ? "date" : "text"
                                    }
                                    value={ach?.actualValue || ""}
                                    onChange={(e) =>
                                      updateAchievement(
                                        goal.id,
                                        "actualValue",
                                        e.target.value
                                      )
                                    }
                                    placeholder={
                                      goal.uomType === "TIMELINE"
                                        ? ""
                                        : "Enter value"
                                    }
                                    className="h-7 text-[13px] px-2"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="relative">
                                    <select
                                      value={ach?.status || "NOT_STARTED"}
                                      onChange={(e) =>
                                        updateAchievement(
                                          goal.id,
                                          "status",
                                          e.target.value
                                        )
                                      }
                                      className="w-full h-7 appearance-none rounded-lg border border-input bg-transparent px-2 text-[13px] text-gray-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 pr-6"
                                    >
                                      {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`text-[13px] font-semibold tabular-nums ${getScoreColor(score)}`}
                                  >
                                    {score !== null ? `${score.toFixed(0)}%` : "--"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`text-[13px] font-semibold tabular-nums ${getScoreColor(weighted || null)}`}
                                  >
                                    {score !== null
                                      ? `${weighted.toFixed(1)}%`
                                      : "--"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50/80 border-t border-gray-200">
                          <td
                            colSpan={4}
                            className="px-3 py-2 text-[13px] font-semibold text-gray-700 text-right"
                          >
                            Overall Weighted Score
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-center">
                            <span
                              className={`text-base font-bold ${getScoreColor(overallScore)}`}
                            >
                              {overallScore.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Check-in notes section */}
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/80">
                    <h3 className="text-[13px] font-semibold text-gray-700">
                      Check-in Notes - {selectedQuarter}
                    </h3>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Your Notes
                      </label>
                      <Textarea
                        value={employeeNotes}
                        onChange={(e) => setEmployeeNotes(e.target.value)}
                        placeholder="Describe your progress, challenges, and any support needed..."
                        rows={3}
                        className="text-[13px] min-h-[72px] resize-none"
                      />
                    </div>

                    {checkIn?.managerComment && (
                      <div className="rounded-md border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
                        <p className="text-[11px] font-medium text-indigo-700 mb-0.5">
                          Manager Comment ({checkIn.manager.name})
                        </p>
                        <p className="text-[13px] text-gray-700">
                          {checkIn.managerComment}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1.5">
                          {new Date(checkIn.checkedInAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score breakdown cards - compact */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {goalSheet.goals
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((goal) => {
                      const score = getGoalScore(goal);
                      const ach = achievements[goal.id];

                      return (
                        <div
                          key={goal.id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                        >
                          <p
                            className="text-[11px] font-medium text-gray-500 truncate"
                            title={goal.title}
                          >
                            {goal.title}
                          </p>
                          <p
                            className={`text-lg font-bold mt-0.5 tabular-nums ${getScoreColor(score)}`}
                          >
                            {score !== null ? `${score.toFixed(0)}%` : "--"}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <StatusBadge
                              status={ach?.status || "NOT_STARTED"}
                              className="text-[10px] px-1.5 py-0"
                            />
                            <span className="text-[10px] text-gray-400 tabular-nums">
                              {goal.weightage}% wt
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
