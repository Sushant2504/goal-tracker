"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Save,
  BarChart3,
  TrendingUp,
  Target,
  MessageSquare,
  User,
} from "lucide-react";
import {
  computeScore,
  getWeightedScore,
  getUomLabel,
  formatTarget,
} from "@/lib/scoring";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

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
        toast.error("Failed to load goal sheet");
      } finally {
        setLoading(false);
      }
    }

    loadSheet();
  }, [selectedMemberId, teamMembers]);

  // Load quarter data
  useEffect(() => {
    if (!goalSheet) return;

    async function loadQuarterData() {
      try {
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

      toast.success("Check-in comment saved!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (teamMembers.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Team Check-ins" },
          ]}
          title="Team Check-ins"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/manager/team")}
            >
              Back to Team
            </Button>
          }
        />
        <EmptyState
          icon={BarChart3}
          title="No Approved Goal Sheets"
          description="Check-ins are only available for team members with approved goal sheets. Approve pending goal sheets first."
          actionLabel="View Team"
          onAction={() => router.push("/dashboard/manager/team")}
        />
      </div>
    );
  }

  const overallScore = getOverallScore();
  const selectedMember = teamMembers.find(
    (m) => m.id === selectedMemberId
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Team Check-ins" },
        ]}
        title="Team Check-ins"
        subtitle="Review progress and provide feedback"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/manager/team")}
            >
              Back to Team
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Saving..." : "Save Comment"}
            </Button>
          </div>
        }
      />

      {/* Team member selector tabs */}
      <Tabs
        value={selectedMemberId || undefined}
        onValueChange={(value) => setSelectedMemberId(value as string)}
      >
        <TabsList variant="line">
          {teamMembers.map((member) => (
            <TabsTrigger key={member.id} value={member.id}>
              <UserAvatar name={member.name} size="xs" />
              <span className="text-[13px]">{member.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Quarter selector tabs */}
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
      </Tabs>

      {goalSheet && selectedMember && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2.5">
                <UserAvatar name={selectedMember.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">
                    {selectedMember.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {selectedMember.department || "No department"}
                  </p>
                </div>
              </div>
            </div>

            <StatCard
              title={`Weighted Score (${selectedQuarter})`}
              value={`${overallScore.toFixed(1)}%`}
              icon={TrendingUp}
              iconClassName="bg-blue-100"
            />

            <StatCard
              title="Goals"
              value={goalSheet.goals.length}
              icon={Target}
              iconClassName="bg-gray-100"
            />
          </div>

          {/* Planned vs Actual table */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-[13px] font-semibold text-gray-700">
                Goal Progress - {selectedQuarter}
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 py-2 px-3">
                    Goal
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 py-2 px-3 w-24">
                    Target
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 py-2 px-3 w-24">
                    Actual
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 py-2 px-3 text-center w-24">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 py-2 px-3 text-center w-20">
                    Score
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 py-2 px-3 text-center w-20">
                    Weighted
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                      <TableRow
                        key={goal.id}
                        className="hover:bg-gray-50/50"
                      >
                        <TableCell className="py-2 px-3">
                          <p className="text-[13px] font-medium text-gray-900">
                            {goal.title}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {goal.thrustArea} ·{" "}
                            {getUomLabel(goal.uomType)} ·{" "}
                            {goal.weightage}%
                          </p>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-[13px] text-gray-700">
                          {formatTarget(goal.uomType, goal.target)}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <span className="text-[13px] font-medium text-gray-900">
                            {ach?.actualValue || "--"}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-center">
                          <StatusBadge
                            status={ach?.status || "NOT_STARTED"}
                          />
                        </TableCell>
                        <TableCell className="py-2 px-3 text-center">
                          <span
                            className={`text-[13px] font-semibold ${getScoreColor(score)}`}
                          >
                            {score !== null
                              ? `${score.toFixed(0)}%`
                              : "--"}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-center">
                          <span
                            className={`text-[13px] font-semibold ${getScoreColor(weighted || null)}`}
                          >
                            {score !== null
                              ? `${weighted.toFixed(1)}%`
                              : "--"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-50">
                  <TableCell
                    colSpan={4}
                    className="py-2.5 px-3 text-[13px] font-semibold text-gray-700 text-right"
                  >
                    Overall Weighted Score
                  </TableCell>
                  <TableCell
                    colSpan={2}
                    className="py-2.5 px-3 text-center"
                  >
                    <span
                      className={`text-base font-bold ${getScoreColor(overallScore)}`}
                    >
                      {overallScore.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Check-in comments section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Employee notes (read-only) */}
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-gray-500" />
                <h3 className="text-[13px] font-semibold text-gray-700">
                  Employee Notes
                </h3>
              </div>
              <div className="p-4">
                {currentCheckIn?.employeeNotes ? (
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                      {currentCheckIn.employeeNotes}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">
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
                  <p className="text-[13px] text-gray-400 text-center py-4">
                    No employee notes for {selectedQuarter} yet.
                  </p>
                )}
              </div>
            </div>

            {/* Manager comment */}
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-[13px] font-semibold text-gray-700">
                  Your Comment
                </h3>
              </div>
              <div className="p-4">
                <textarea
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  placeholder="Provide feedback on the employee's progress, guidance, or action items..."
                  rows={5}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Check-in history */}
          {goalSheet.checkIns && goalSheet.checkIns.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <h3 className="text-[13px] font-semibold text-gray-700">
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
                    <div key={ci.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={ci.quarter} />
                          <span className="text-[11px] text-gray-400">
                            {new Date(
                              ci.checkedInAt
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {ci.manager && (
                          <span className="text-[11px] text-gray-400">
                            Manager: {ci.manager.name}
                          </span>
                        )}
                      </div>
                      {ci.employeeNotes && (
                        <div className="mb-1.5">
                          <p className="text-[11px] font-medium text-gray-500 mb-0.5">
                            Employee Notes
                          </p>
                          <p className="text-[13px] text-gray-700">
                            {ci.employeeNotes}
                          </p>
                        </div>
                      )}
                      {ci.managerComment && (
                        <div>
                          <p className="text-[11px] font-medium text-blue-600 mb-0.5">
                            Manager Comment
                          </p>
                          <p className="text-[13px] text-gray-700">
                            {ci.managerComment}
                          </p>
                        </div>
                      )}
                      {!ci.employeeNotes && !ci.managerComment && (
                        <p className="text-[13px] text-gray-400 italic">
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
    <Suspense fallback={<PageSkeleton />}>
      <ManagerCheckinsContent />
    </Suspense>
  );
}
