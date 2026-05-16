"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ArrowLeft,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Calendar,
  User,
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
  achievements: Achievement[];
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
  employee: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    managerId: string;
  };
  cycle: { id: string; name: string };
  goals: Goal[];
  checkIns: CheckIn[];
}

interface CheckIn {
  id: string;
  quarter: string;
  employeeNotes: string | null;
  managerComment: string | null;
  checkedInAt: string;
  manager: { id: string; name: string };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string | null;
  sheetId: string;
}

function ManagerCheckinsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSheetId = searchParams.get("sheetId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [goalSheet, setGoalSheet] = useState<GoalSheet | null>(null);
  const [achievements, setAchievements] = useState<
    Record<string, Achievement>
  >({});
  const [managerComment, setManagerComment] = useState("");
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckIn | null>(
    null
  );
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    null
  );
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

  // Load team members with approved sheets
  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadTeam() {
      try {
        const cycleRes = await fetch("/api/admin/cycles");
        if (!cycleRes.ok) return;
        const cycles = await cycleRes.json();
        const active = cycles.find(
          (c: { status: string }) => c.status === "ACTIVE"
        );
        if (!active) {
          setLoading(false);
          return;
        }

        const sheetsRes = await fetch(
          `/api/goal-sheets?cycleId=${active.id}&team=true`
        );
        if (!sheetsRes.ok) return;
        const sheets: GoalSheet[] = await sheetsRes.json();

        // Only approved sheets can have check-ins
        const approvedSheets = sheets.filter(
          (s) => s.status === "APPROVED"
        );
        const members: TeamMember[] = approvedSheets.map((s) => ({
          id: s.employeeId,
          name: s.employee.name,
          email: s.employee.email,
          department: s.employee.department,
          sheetId: s.id,
        }));
        setTeamMembers(members);

        // If paramSheetId, select that member
        if (paramSheetId) {
          const target = members.find(
            (m) => m.sheetId === paramSheetId
          );
          if (target) {
            setSelectedMemberId(target.id);
          }
        } else if (members.length > 0) {
          setSelectedMemberId(members[0].id);
        }
      } catch (err) {
        console.error("Load team error:", err);
      } finally {
        if (!paramSheetId) setLoading(false);
      }
    }

    loadTeam();
  }, [session?.user?.id, paramSheetId]);

  // Load selected member's goal sheet
  useEffect(() => {
    if (!selectedMemberId) {
      setGoalSheet(null);
      setLoading(false);
      return;
    }

    const member = teamMembers.find((m) => m.id === selectedMemberId);
    if (!member) return;

    async function loadSheet() {
      setLoading(true);
      try {
        const res = await fetch(`/api/goal-sheets/${member!.sheetId}`);
        if (!res.ok) throw new Error("Failed to load goal sheet");
        const sheet: GoalSheet = await res.json();
        setGoalSheet(sheet);
      } catch (err) {
        console.error("Load sheet error:", err);
        showToast("Failed to load goal sheet", "error");
      } finally {
        setLoading(false);
      }
    }

    loadSheet();
  }, [selectedMemberId, teamMembers, showToast]);

  // Load quarter data
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
            setCurrentCheckIn(ciData[0]);
            setManagerComment(ciData[0].managerComment || "");
          } else {
            setCurrentCheckIn(null);
            setManagerComment("");
          }
        }
      } catch (err) {
        console.error("Load quarter data error:", err);
      }
    }

    loadQuarterData();
  }, [goalSheet, selectedQuarter]);

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

  async function handleSave() {
    if (!goalSheet) return;
    setSaving(true);

    try {
      // Save manager comment
      if (managerComment.trim()) {
        const ciRes = await fetch("/api/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalSheetId: goalSheet.id,
            quarter: selectedQuarter,
            managerComment: managerComment.trim(),
          }),
        });

        if (!ciRes.ok) {
          const data = await ciRes.json();
          throw new Error(data.error || "Failed to save comment");
        }

        const ciData = await ciRes.json();
        setCurrentCheckIn(ciData);
      }

      showToast("Check-in comment saved!", "success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
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

  if (teamMembers.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/manager/team")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Team
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center max-w-md">
            <BarChart3 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Approved Goal Sheets
            </h3>
            <p className="text-sm text-gray-500">
              Check-ins are only available for team members with approved
              goal sheets. Approve pending goal sheets first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const overallScore = getOverallScore();
  const selectedMember = teamMembers.find(
    (m) => m.id === selectedMemberId
  );

  // Get all check-ins for history
  const checkInHistory =
    goalSheet?.checkIns
      ?.filter((ci) => ci.quarter === selectedQuarter)
      .sort(
        (a, b) =>
          new Date(b.checkedInAt).getTime() -
          new Date(a.checkedInAt).getTime()
      ) || [];

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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/manager/team")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Team Check-ins
            </h2>
            <p className="text-xs text-gray-500">
              Review progress and provide feedback
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save Comment"}
        </Button>
      </div>

      {/* Team member selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {teamMembers.map((member) => (
          <button
            key={member.id}
            onClick={() => setSelectedMemberId(member.id)}
            className={`flex items-center gap-2 shrink-0 rounded-lg border px-3 py-2 text-sm transition-colors ${
              selectedMemberId === member.id
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                selectedMemberId === member.id
                  ? "bg-indigo-200 text-indigo-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <span className="hidden sm:inline">{member.name}</span>
            <span className="sm:hidden">
              {member.name.split(" ")[0]}
            </span>
          </button>
        ))}
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

      {goalSheet && selectedMember && (
        <>
          {/* Member info + score summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
                  {selectedMember.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedMember.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedMember.department || "No department"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Weighted Score ({selectedQuarter})
                  </p>
                  <p
                    className={`text-xl font-bold ${getScoreColor(overallScore)}`}
                  >
                    {overallScore.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Goals</p>
                  <p className="text-xl font-bold text-gray-900">
                    {goalSheet.goals.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Planned vs Actual comparison table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">
                Goal Progress - {selectedQuarter}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Goal
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                      Target
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                      Actual
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                      Status
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                      Score
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
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
                      const weighted = getWeightedScore(
                        score,
                        goal.weightage
                      );

                      return (
                        <tr key={goal.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">
                              {goal.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {goal.thrustArea} &middot;{" "}
                              {getUomLabel(goal.uomType)} &middot;{" "}
                              {goal.weightage}%
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatTarget(goal.uomType, goal.target)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {ach?.actualValue || "--"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(ach?.status || "NOT_STARTED")}`}
                            >
                              {(
                                ach?.status || "NOT_STARTED"
                              ).replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-sm font-semibold ${getScoreColor(score)}`}
                            >
                              {score !== null
                                ? `${score.toFixed(0)}%`
                                : "--"}
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

          {/* Check-in comments section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Employee notes (read-only) */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Employee Notes
                </h3>
              </div>
              <div className="p-5">
                {currentCheckIn?.employeeNotes ? (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {currentCheckIn.employeeNotes}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Last updated{" "}
                      {new Date(
                        currentCheckIn.checkedInAt
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No employee notes for {selectedQuarter} yet.
                  </p>
                )}
              </div>
            </div>

            {/* Manager comment */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Your Comment
                </h3>
              </div>
              <div className="p-5">
                <textarea
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  placeholder="Provide feedback on the employee's progress, guidance, or action items..."
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Check-in history */}
          {goalSheet.checkIns && goalSheet.checkIns.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">
                  Check-in History
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {goalSheet.checkIns
                  .sort(
                    (a, b) =>
                      new Date(b.checkedInAt).getTime() -
                      new Date(a.checkedInAt).getTime()
                  )
                  .map((ci) => (
                    <div key={ci.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
                            {ci.quarter}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(ci.checkedInAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        {ci.manager && (
                          <span className="text-xs text-gray-400">
                            Manager: {ci.manager.name}
                          </span>
                        )}
                      </div>
                      {ci.employeeNotes && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">
                            Employee Notes
                          </p>
                          <p className="text-sm text-gray-700">
                            {ci.employeeNotes}
                          </p>
                        </div>
                      )}
                      {ci.managerComment && (
                        <div>
                          <p className="text-xs font-medium text-indigo-600 mb-0.5">
                            Manager Comment
                          </p>
                          <p className="text-sm text-gray-700">
                            {ci.managerComment}
                          </p>
                        </div>
                      )}
                      {!ci.employeeNotes && !ci.managerComment && (
                        <p className="text-sm text-gray-400 italic">
                          No notes recorded
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ManagerCheckinsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <ManagerCheckinsContent />
    </Suspense>
  );
}
