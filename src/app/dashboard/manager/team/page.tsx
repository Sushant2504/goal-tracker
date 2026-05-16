"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Search,
  BarChart3,
  Send,
  Eye,
} from "lucide-react";

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
    SUBMITTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RETURNED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || styles.DRAFT}`}
    >
      {status}
    </span>
  );
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

interface GoalSheet {
  id: string;
  employeeId: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  cycle: { id: string; name: string; status: string };
  goals: { id: string; title: string; weightage: number }[];
  employee: TeamMember;
  approvedBy: { id: string; name: string } | null;
}

interface GoalCycle {
  id: string;
  name: string;
  status: string;
}

export default function ManagerTeamPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState<GoalCycle | null>(null);
  const [teamSheets, setTeamSheets] = useState<GoalSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return;

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
      setActiveCycle(active);

      // Get team's goal sheets
      const sheetsRes = await fetch(
        `/api/goal-sheets?cycleId=${active.id}&team=true`
      );
      if (!sheetsRes.ok) throw new Error("Failed to load team sheets");
      const sheets: GoalSheet[] = await sheetsRes.json();
      setTeamSheets(sheets);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSheets = teamSheets.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.employee.name.toLowerCase().includes(q) ||
      s.employee.email.toLowerCase().includes(q) ||
      (s.employee.department || "").toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalMembers = new Set(teamSheets.map((s) => s.employeeId)).size;
  const submittedCount = teamSheets.filter(
    (s) => s.status === "SUBMITTED"
  ).length;
  const approvedCount = teamSheets.filter(
    (s) => s.status === "APPROVED"
  ).length;
  const draftCount = teamSheets.filter(
    (s) => s.status === "DRAFT"
  ).length;
  const returnedCount = teamSheets.filter(
    (s) => s.status === "RETURNED"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center max-w-md">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Active Goal Cycle
          </h3>
          <p className="text-sm text-gray-600">
            There is no active goal cycle at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          {activeCycle.name} &middot; Overview of your direct reports&apos;
          goal progress
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
              <Users className="h-4.5 w-4.5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Members</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100">
              <Send className="h-4.5 w-4.5 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{submittedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending Approval</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Approved</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <Clock className="h-4.5 w-4.5 text-gray-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {draftCount + returnedCount}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">In Progress</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalMembers > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Team Goal Completion
            </span>
            <span className="text-sm text-gray-500">
              {approvedCount} of {totalMembers} approved
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${totalMembers > 0 ? (approvedCount / totalMembers) * 100 : 0}%`,
              }}
            />
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{
                width: `${totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0}%`,
              }}
            />
            <div
              className="h-full bg-red-400 transition-all"
              style={{
                width: `${totalMembers > 0 ? (returnedCount / totalMembers) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Approved
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              Submitted
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              Returned
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
              Draft
            </span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or department..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Team members list */}
      {filteredSheets.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            {searchQuery
              ? "No matching team members"
              : "No goal sheets found"}
          </h3>
          <p className="text-sm text-gray-500">
            {searchQuery
              ? "Try adjusting your search query."
              : "Your team members haven't created goal sheets for this cycle yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.id}
              className="rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold shrink-0">
                    {sheet.employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {sheet.employee.name}
                      </p>
                      {getStatusBadge(sheet.status)}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {sheet.employee.email}
                      {sheet.employee.department &&
                        ` · ${sheet.employee.department}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>{sheet.goals.length} goals</span>
                      <span>
                        {sheet.goals.reduce((s, g) => s + g.weightage, 0)}%
                        weightage
                      </span>
                      {sheet.submittedAt && (
                        <span>
                          Submitted{" "}
                          {new Date(sheet.submittedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      )}
                      {sheet.approvedAt && (
                        <span>
                          Approved{" "}
                          {new Date(sheet.approvedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {sheet.status === "SUBMITTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/dashboard/manager/approve?sheetId=${sheet.id}`
                        )
                      }
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Review
                    </Button>
                  )}
                  {sheet.status === "APPROVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/dashboard/manager/checkins?sheetId=${sheet.id}`
                        )
                      }
                    >
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                      Check-ins
                    </Button>
                  )}
                  <button
                    onClick={() =>
                      router.push(
                        sheet.status === "SUBMITTED"
                          ? `/dashboard/manager/approve?sheetId=${sheet.id}`
                          : `/dashboard/manager/checkins?sheetId=${sheet.id}`
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
