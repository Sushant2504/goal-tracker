"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  FileText,
  Target,
  Edit3,
  Save,
  ArrowLeft,
  User,
  Info,
} from "lucide-react";
import { getUomLabel, formatTarget } from "@/lib/scoring";
import { GOAL_RULES } from "@/lib/validation";

const THRUST_AREAS = [
  "Product Development",
  "Quality",
  "Revenue",
  "Customer Success",
  "Operational Excellence",
  "Cost Optimization",
  "Safety",
  "Learning",
  "Efficiency",
  "Innovation",
];

const UOM_TYPES = [
  { value: "MIN_NUMERIC", label: "Numeric (Higher is better)" },
  { value: "MIN_PERCENT", label: "% (Higher is better)" },
  { value: "MAX_NUMERIC", label: "Numeric (Lower is better)" },
  { value: "MAX_PERCENT", label: "% (Lower is better)" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero-based" },
];

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
    SUBMITTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RETURNED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.DRAFT}`}
    >
      {status}
    </span>
  );
}

interface GoalData {
  id: string;
  thrustArea: string;
  title: string;
  description: string | null;
  uomType: string;
  target: string;
  weightage: number;
  sortOrder: number;
  isShared: boolean;
  sharedFromGoalId: string | null;
  titleReadOnly: boolean;
  targetReadOnly: boolean;
}

interface GoalSheet {
  id: string;
  employeeId: string;
  status: string;
  submittedAt: string | null;
  returnComment: string | null;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    managerId: string;
  };
  cycle: {
    id: string;
    name: string;
    status: string;
    goalSettingOpens: string;
    goalSettingCloses: string;
  };
  goals: GoalData[];
  approvedBy: { id: string; name: string } | null;
}

function ManagerApproveContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheetId = searchParams.get("sheetId");

  const [loading, setLoading] = useState(true);
  const [goalSheet, setGoalSheet] = useState<GoalSheet | null>(null);
  const [editedGoals, setEditedGoals] = useState<GoalData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [submittedSheets, setSubmittedSheets] = useState<GoalSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(
    sheetId
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

  // Load submitted sheets if no specific sheetId
  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadSubmittedSheets() {
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
          `/api/goal-sheets?cycleId=${active.id}&team=true&status=SUBMITTED`
        );
        if (!sheetsRes.ok) return;
        const sheets: GoalSheet[] = await sheetsRes.json();
        setSubmittedSheets(sheets);

        // If we have a sheetId from URL, select it
        if (sheetId && sheets.some((s) => s.id === sheetId)) {
          setSelectedSheetId(sheetId);
        } else if (!sheetId && sheets.length > 0) {
          setSelectedSheetId(sheets[0].id);
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        if (!sheetId) setLoading(false);
      }
    }

    loadSubmittedSheets();
  }, [session?.user?.id, sheetId]);

  // Load selected goal sheet
  useEffect(() => {
    if (!selectedSheetId) {
      setGoalSheet(null);
      setLoading(false);
      return;
    }

    async function loadSheet() {
      setLoading(true);
      try {
        const res = await fetch(`/api/goal-sheets/${selectedSheetId}`);
        if (!res.ok) throw new Error("Failed to load goal sheet");
        const sheet: GoalSheet = await res.json();
        setGoalSheet(sheet);
        setEditedGoals(
          sheet.goals.map((g) => ({ ...g }))
        );
      } catch (err) {
        console.error("Load sheet error:", err);
        showToast("Failed to load goal sheet", "error");
      } finally {
        setLoading(false);
      }
    }

    loadSheet();
  }, [selectedSheetId, showToast]);

  const totalWeightage = editedGoals.reduce(
    (sum, g) => sum + g.weightage,
    0
  );

  function updateGoal(index: number, field: keyof GoalData, value: string | number) {
    const updated = [...editedGoals];
    updated[index] = { ...updated[index], [field]: value };
    setEditedGoals(updated);
  }

  async function handleSaveEdits() {
    if (!goalSheet) return;
    setSavingEdits(true);

    try {
      const res = await fetch(`/api/goal-sheets/${goalSheet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: editedGoals.map((g, i) => ({
            thrustArea: g.thrustArea,
            title: g.title,
            description: g.description || undefined,
            uomType: g.uomType,
            target: g.target,
            weightage: g.weightage,
            sortOrder: i,
            isShared: g.isShared,
            sharedFromGoalId: g.sharedFromGoalId,
            titleReadOnly: g.titleReadOnly,
            targetReadOnly: g.targetReadOnly,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.errors
            ? data.errors.map((e: { message: string }) => e.message).join(", ")
            : data.error || "Failed to save"
        );
      }

      const updated = await res.json();
      setGoalSheet(updated);
      setEditedGoals(updated.goals.map((g: GoalData) => ({ ...g })));
      setIsEditing(false);
      showToast("Goals updated successfully", "success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save edits";
      showToast(message, "error");
    } finally {
      setSavingEdits(false);
    }
  }

  async function handleApprove() {
    if (!goalSheet) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `/api/goal-sheets/${goalSheet.id}/approve`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve");
      }

      showToast("Goal sheet approved successfully!", "success");
      // Remove from submitted list
      setSubmittedSheets((prev) =>
        prev.filter((s) => s.id !== goalSheet.id)
      );
      // Move to next or clear
      const remaining = submittedSheets.filter(
        (s) => s.id !== goalSheet.id
      );
      if (remaining.length > 0) {
        setSelectedSheetId(remaining[0].id);
      } else {
        setSelectedSheetId(null);
        setGoalSheet(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to approve";
      showToast(message, "error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReturn() {
    if (!goalSheet || !returnComment.trim()) {
      showToast("Please provide a comment explaining why the goal sheet is being returned.", "error");
      return;
    }
    setProcessing(true);

    try {
      const res = await fetch(
        `/api/goal-sheets/${goalSheet.id}/return`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: returnComment.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to return");
      }

      setShowReturnDialog(false);
      setReturnComment("");
      showToast("Goal sheet returned for revision", "success");
      // Remove from submitted list
      setSubmittedSheets((prev) =>
        prev.filter((s) => s.id !== goalSheet.id)
      );
      const remaining = submittedSheets.filter(
        (s) => s.id !== goalSheet.id
      );
      if (remaining.length > 0) {
        setSelectedSheetId(remaining[0].id);
      } else {
        setSelectedSheetId(null);
        setGoalSheet(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to return";
      showToast(message, "error");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (submittedSheets.length === 0 && !goalSheet) {
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
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center max-w-md">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              All Caught Up!
            </h3>
            <p className="text-sm text-gray-600">
              There are no goal sheets pending your approval at this time.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Return dialog overlay */}
      {showReturnDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Return for Revision
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide feedback explaining what changes are needed.
              This comment will be visible to the employee.
            </p>
            <textarea
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              placeholder="Enter your feedback..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReturnDialog(false);
                  setReturnComment("");
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReturn}
                disabled={processing || !returnComment.trim()}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {processing ? "Returning..." : "Return for Rework"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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
            Goal Sheet Review
          </h2>
          <p className="text-xs text-gray-500">
            {submittedSheets.length} sheet
            {submittedSheets.length !== 1 ? "s" : ""} pending approval
          </p>
        </div>
      </div>

      {/* Sheet selector (if multiple) */}
      {submittedSheets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {submittedSheets.map((sheet) => (
            <button
              key={sheet.id}
              onClick={() => {
                setSelectedSheetId(sheet.id);
                setIsEditing(false);
              }}
              className={`flex items-center gap-2 shrink-0 rounded-lg border px-3 py-2 text-sm transition-colors ${
                selectedSheetId === sheet.id
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {sheet.employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              {sheet.employee.name}
            </button>
          ))}
        </div>
      )}

      {goalSheet && (
        <>
          {/* Employee info card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-base font-semibold">
                  {goalSheet.employee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {goalSheet.employee.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {goalSheet.employee.email}
                    {goalSheet.employee.department &&
                      ` · ${goalSheet.employee.department}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(goalSheet.status)}
                    <span className="text-xs text-gray-400">
                      {goalSheet.cycle.name}
                    </span>
                    {goalSheet.submittedAt && (
                      <span className="text-xs text-gray-400">
                        · Submitted{" "}
                        {new Date(
                          goalSheet.submittedAt
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {goalSheet.status === "SUBMITTED" && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Edit Goals
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedGoals(
                          goalSheet.goals.map((g) => ({ ...g }))
                        );
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdits}
                      disabled={savingEdits}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      {savingEdits ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Weightage summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Total Weightage
              </span>
              <span
                className={`text-sm font-bold ${
                  totalWeightage === 100
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {totalWeightage}% / 100%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalWeightage === 100
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(totalWeightage, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {editedGoals.length} goals &middot; Min{" "}
              {GOAL_RULES.MIN_WEIGHTAGE}% per goal &middot; Max{" "}
              {GOAL_RULES.MAX_GOALS} goals
            </p>
          </div>

          {/* Goals */}
          <div className="space-y-3">
            {(isEditing ? editedGoals : goalSheet.goals)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((goal, index) => (
                <div
                  key={goal.id || index}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                >
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">
                      Goal {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5">
                        {goal.thrustArea}
                      </span>
                      <span className="text-xs text-gray-500">
                        {goal.weightage}% weight
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={
                                editedGoals[index]?.title || ""
                              }
                              onChange={(e) =>
                                updateGoal(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                              disabled={goal.titleReadOnly}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Target
                            </label>
                            <input
                              type={
                                goal.uomType === "TIMELINE"
                                  ? "date"
                                  : "text"
                              }
                              value={
                                editedGoals[index]?.target || ""
                              }
                              onChange={(e) =>
                                updateGoal(
                                  index,
                                  "target",
                                  e.target.value
                                )
                              }
                              disabled={goal.targetReadOnly}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              UoM Type
                            </label>
                            <div className="relative">
                              <select
                                value={
                                  editedGoals[index]?.uomType ||
                                  "MIN_NUMERIC"
                                }
                                onChange={(e) =>
                                  updateGoal(
                                    index,
                                    "uomType",
                                    e.target.value
                                  )
                                }
                                className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-8"
                              >
                                {UOM_TYPES.map((u) => (
                                  <option
                                    key={u.value}
                                    value={u.value}
                                  >
                                    {u.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Weightage (%)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={5}
                              value={
                                editedGoals[index]?.weightage || ""
                              }
                              onChange={(e) =>
                                updateGoal(
                                  index,
                                  "weightage",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {goal.title}
                          </h4>
                          {goal.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            <span className="text-xs text-gray-400">
                              UoM:{" "}
                            </span>
                            {getUomLabel(goal.uomType)}
                          </span>
                          <span>
                            <span className="text-xs text-gray-400">
                              Target:{" "}
                            </span>
                            {formatTarget(goal.uomType, goal.target)}
                          </span>
                          <span>
                            <span className="text-xs text-gray-400">
                              Weight:{" "}
                            </span>
                            {goal.weightage}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Action buttons */}
          {goalSheet.status === "SUBMITTED" && !isEditing && (
            <div className="sticky bottom-0 rounded-xl border border-gray-200 bg-white p-4 shadow-lg flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Review complete? Choose an action below.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setShowReturnDialog(true)}
                  disabled={processing}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Return for Rework
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {processing ? "Processing..." : "Approve Goals"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ManagerApprovePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <ManagerApproveContent />
    </Suspense>
  );
}
