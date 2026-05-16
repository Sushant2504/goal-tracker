"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Target,
  BarChart3,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  computeScore,
  getWeightedScore,
  getUomLabel,
  formatTarget,
} from "@/lib/scoring";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "DELAYED", label: "Delayed" },
  { value: "COMPLETED", label: "Completed" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "NOT_STARTED":
      return "bg-gray-100 text-gray-700";
    case "ON_TRACK":
      return "bg-emerald-100 text-emerald-700";
    case "AT_RISK":
      return "bg-amber-100 text-amber-700";
    case "DELAYED":
      return "bg-red-100 text-red-700";
    case "COMPLETED":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getScoreColor(score: number | null) {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
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
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

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
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user?.id, showToast]);

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

      showToast("Check-in saved successfully!", "success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save";
      showToast(message, "error");
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">Loading check-ins...</p>
        </div>
      </div>
    );
  }

  if (!goalSheet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center max-w-md">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Goal Sheet Found
          </h3>
          <p className="text-sm text-gray-600">
            You need an active goal sheet before you can add check-ins.
            Please create and submit your goals first.
          </p>
        </div>
      </div>
    );
  }

  if (goalSheet.status !== "APPROVED") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-8 text-center max-w-md">
          <Info className="mx-auto h-10 w-10 text-blue-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Goals Not Yet Approved
          </h3>
          <p className="text-sm text-gray-600">
            Check-ins can only be entered once your goal sheet has been
            approved by your manager. Current status:{" "}
            <span className="font-semibold">{goalSheet.status}</span>
          </p>
        </div>
      </div>
    );
  }

  const overallScore = getOverallScore();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100"
          >
            x
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Quarterly Check-ins
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {goalSheet.cycle.name} &middot; Track your progress against
            approved goals
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save Check-in"}
        </Button>
      </div>

      {/* Quarter selector */}
      <div className="flex gap-2">
        {QUARTERS.map((q) => (
          <button
            key={q}
            onClick={() => setSelectedQuarter(q)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedQuarter === q
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Overall score card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                Overall Weighted Score - {selectedQuarter}
              </p>
              <p
                className={`text-2xl font-bold ${getScoreColor(overallScore)}`}
              >
                {overallScore.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="h-16 w-16 relative">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={
                    overallScore >= 80
                      ? "#059669"
                      : overallScore >= 50
                        ? "#d97706"
                        : "#dc2626"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${overallScore}, 100`}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Goals table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Goal
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Target
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                  Actual Value
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                  Score
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
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
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {goal.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {goal.thrustArea} &middot;{" "}
                            {getUomLabel(goal.uomType)} &middot;{" "}
                            {goal.weightage}%
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {formatTarget(goal.uomType, goal.target)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
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
                          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </td>
                      <td className="px-4 py-3">
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
                            className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-7"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-semibold ${getScoreColor(score)}`}
                        >
                          {score !== null ? `${score.toFixed(0)}%` : "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-semibold ${getScoreColor(weighted || null)}`}
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
              <tr className="bg-gray-50 border-t border-gray-200">
                <td
                  colSpan={4}
                  className="px-4 py-3 text-sm font-semibold text-gray-700 text-right"
                >
                  Overall Weighted Score
                </td>
                <td colSpan={2} className="px-4 py-3 text-center">
                  <span
                    className={`text-lg font-bold ${getScoreColor(overallScore)}`}
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
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            Check-in Notes - {selectedQuarter}
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Your Notes
            </label>
            <textarea
              value={employeeNotes}
              onChange={(e) => setEmployeeNotes(e.target.value)}
              placeholder="Describe your progress, challenges, and any support needed..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>

          {checkIn?.managerComment && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-xs font-medium text-indigo-700 mb-1">
                Manager Comment ({checkIn.manager.name})
              </p>
              <p className="text-sm text-gray-700">
                {checkIn.managerComment}
              </p>
              <p className="text-xs text-gray-400 mt-2">
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

      {/* Score breakdown cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {goalSheet.goals
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((goal) => {
            const score = getGoalScore(goal);
            const weighted = getWeightedScore(score, goal.weightage);
            const ach = achievements[goal.id];

            return (
              <div
                key={goal.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <p
                  className="text-xs font-medium text-gray-500 truncate"
                  title={goal.title}
                >
                  {goal.title}
                </p>
                <p
                  className={`text-xl font-bold mt-1 ${getScoreColor(score)}`}
                >
                  {score !== null ? `${score.toFixed(0)}%` : "--"}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(ach?.status || "NOT_STARTED")}`}
                  >
                    {ach?.status?.replace("_", " ") || "Not Started"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {goal.weightage}% wt
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
