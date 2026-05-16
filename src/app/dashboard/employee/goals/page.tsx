"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  Target,
  Info,
} from "lucide-react";
import {
  validateGoals,
  GOAL_RULES,
  type GoalInput,
  type ValidationError,
} from "@/lib/validation";
import { getUomLabel, formatTarget } from "@/lib/scoring";

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

interface GoalFormData {
  id?: string;
  thrustArea: string;
  title: string;
  description: string;
  uomType: string;
  target: string;
  weightage: number;
  isShared: boolean;
  sharedFromGoalId: string | null;
  titleReadOnly: boolean;
  targetReadOnly: boolean;
  sortOrder: number;
}

interface GoalSheet {
  id: string;
  employeeId: string;
  cycleId: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  returnComment: string | null;
  cycle: { id: string; name: string; status: string };
  goals: GoalFormData[];
}

interface GoalCycle {
  id: string;
  name: string;
  status: string;
  goalSettingOpens: string;
  goalSettingCloses: string;
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
    SUBMITTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RETURNED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.DRAFT}`}
    >
      {status}
    </span>
  );
}

function emptyGoal(sortOrder: number): GoalFormData {
  return {
    thrustArea: "",
    title: "",
    description: "",
    uomType: "MIN_NUMERIC",
    target: "",
    weightage: 0,
    isShared: false,
    sharedFromGoalId: null,
    titleReadOnly: false,
    targetReadOnly: false,
    sortOrder,
  };
}

export default function EmployeeGoalsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeCycle, setActiveCycle] = useState<GoalCycle | null>(null);
  const [goalSheet, setGoalSheet] = useState<GoalSheet | null>(null);
  const [goals, setGoals] = useState<GoalFormData[]>([emptyGoal(0)]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
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

  // Load active cycle and goal sheet
  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadData() {
      try {
        // Fetch active cycle
        const cycleRes = await fetch("/api/admin/cycles");
        if (!cycleRes.ok) throw new Error("Failed to load cycles");
        const cycles: GoalCycle[] = await cycleRes.json();
        const active = cycles.find((c) => c.status === "ACTIVE");
        if (!active) {
          setActiveCycle(null);
          setLoading(false);
          return;
        }
        setActiveCycle(active);

        // Fetch goal sheets for this cycle
        const sheetsRes = await fetch(
          `/api/goal-sheets?cycleId=${active.id}`
        );
        if (!sheetsRes.ok) throw new Error("Failed to load goal sheets");
        const sheets: GoalSheet[] = await sheetsRes.json();
        const mySheet = sheets.find(
          (s) => s.employeeId === session!.user.id
        );

        if (mySheet) {
          // Load full sheet with goals
          const fullRes = await fetch(`/api/goal-sheets/${mySheet.id}`);
          if (!fullRes.ok) throw new Error("Failed to load goal sheet");
          const fullSheet: GoalSheet = await fullRes.json();
          setGoalSheet(fullSheet);
          if (fullSheet.goals.length > 0) {
            setGoals(
              fullSheet.goals.map((g, i) => ({
                id: g.id,
                thrustArea: g.thrustArea || "",
                title: g.title || "",
                description: g.description || "",
                uomType: g.uomType || "MIN_NUMERIC",
                target: g.target || "",
                weightage: g.weightage || 0,
                isShared: g.isShared || false,
                sharedFromGoalId: g.sharedFromGoalId || null,
                titleReadOnly: g.titleReadOnly || false,
                targetReadOnly: g.targetReadOnly || false,
                sortOrder: g.sortOrder ?? i,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Load error:", err);
        showToast("Failed to load data. Please refresh.", "error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user?.id, showToast]);

  const totalWeightage = goals.reduce((sum, g) => sum + (g.weightage || 0), 0);
  const isEditable =
    !goalSheet ||
    goalSheet.status === "DRAFT" ||
    goalSheet.status === "RETURNED";
  const isReadOnly = goalSheet
    ? goalSheet.status === "SUBMITTED" || goalSheet.status === "APPROVED"
    : false;

  function addGoal() {
    if (goals.length >= GOAL_RULES.MAX_GOALS) {
      showToast(
        `Maximum ${GOAL_RULES.MAX_GOALS} goals allowed`,
        "error"
      );
      return;
    }
    setGoals([...goals, emptyGoal(goals.length)]);
  }

  function removeGoal(index: number) {
    if (goals.length <= 1) return;
    const updated = goals.filter((_, i) => i !== index);
    setGoals(updated.map((g, i) => ({ ...g, sortOrder: i })));
  }

  function updateGoal(index: number, field: keyof GoalFormData, value: string | number | boolean) {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value };
    setGoals(updated);
    // Clear errors when user makes changes
    if (errors.length > 0) setErrors([]);
  }

  async function ensureGoalSheet(): Promise<string | null> {
    if (goalSheet) return goalSheet.id;
    if (!activeCycle) return null;

    try {
      const res = await fetch("/api/goal-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: activeCycle.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create goal sheet");
      }
      const newSheet: GoalSheet = await res.json();
      setGoalSheet(newSheet);
      return newSheet.id;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create goal sheet";
      showToast(message, "error");
      return null;
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const sheetId = await ensureGoalSheet();
      if (!sheetId) return;

      const res = await fetch(`/api/goal-sheets/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: goals.map((g, i) => ({
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
        if (data.errors) {
          setErrors(data.errors);
          showToast("Please fix validation errors", "error");
          return;
        }
        throw new Error(data.error || "Failed to save");
      }

      const updated = await res.json();
      setGoalSheet(updated);
      if (updated.goals) {
        setGoals(
          updated.goals.map((g: GoalFormData, i: number) => ({
            id: g.id,
            thrustArea: g.thrustArea || "",
            title: g.title || "",
            description: g.description || "",
            uomType: g.uomType || "MIN_NUMERIC",
            target: g.target || "",
            weightage: g.weightage || 0,
            isShared: g.isShared || false,
            sharedFromGoalId: g.sharedFromGoalId || null,
            titleReadOnly: g.titleReadOnly || false,
            targetReadOnly: g.targetReadOnly || false,
            sortOrder: g.sortOrder ?? i,
          }))
        );
      }
      setErrors([]);
      showToast("Goals saved as draft", "success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save goals";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    // Validate before submitting
    const validationErrors = validateGoals(
      goals.map((g) => ({
        thrustArea: g.thrustArea,
        title: g.title,
        description: g.description || undefined,
        uomType: g.uomType,
        target: g.target,
        weightage: g.weightage,
      }))
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      showToast("Please fix all validation errors before submitting", "error");
      return;
    }

    setSubmitting(true);
    try {
      // Save first
      const sheetId = await ensureGoalSheet();
      if (!sheetId) return;

      const saveRes = await fetch(`/api/goal-sheets/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: goals.map((g, i) => ({
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

      if (!saveRes.ok) {
        const data = await saveRes.json();
        if (data.errors) {
          setErrors(data.errors);
          showToast("Please fix validation errors", "error");
          return;
        }
        throw new Error(data.error || "Failed to save");
      }

      // Then submit
      const submitRes = await fetch(`/api/goal-sheets/${sheetId}/submit`, {
        method: "POST",
      });

      if (!submitRes.ok) {
        const data = await submitRes.json();
        if (data.errors) {
          setErrors(data.errors);
          showToast("Validation errors during submission", "error");
          return;
        }
        throw new Error(data.error || "Failed to submit");
      }

      const submitted = await submitRes.json();
      setGoalSheet(submitted);
      setErrors([]);
      showToast("Goal sheet submitted for approval!", "success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">Loading goals...</p>
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
            There is no active goal cycle at the moment. Please check back
            later or contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all ${
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
          <h2 className="text-2xl font-bold text-gray-900">My Goals</h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeCycle.name} &middot;{" "}
            {goalSheet
              ? getStatusBadge(goalSheet.status)
              : getStatusBadge("DRAFT")}
          </p>
        </div>
        {isEditable && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || submitting}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || submitting}
            >
              <Send className="h-4 w-4 mr-1" />
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        )}
      </div>

      {/* Return comment banner */}
      {goalSheet?.status === "RETURNED" && goalSheet.returnComment && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">
                Returned for Revision
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {goalSheet.returnComment}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-700">
              {goalSheet?.status === "SUBMITTED"
                ? "Your goal sheet has been submitted and is pending manager approval. Goals cannot be edited."
                : "Your goal sheet has been approved. Goals are locked."}
            </p>
          </div>
        </div>
      )}

      {/* Weightage summary bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Total Weightage
          </span>
          <span
            className={`text-sm font-bold ${
              totalWeightage === 100
                ? "text-emerald-600"
                : totalWeightage > 100
                  ? "text-red-600"
                  : "text-amber-600"
            }`}
          >
            {totalWeightage}% / 100%
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              totalWeightage === 100
                ? "bg-emerald-500"
                : totalWeightage > 100
                  ? "bg-red-500"
                  : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(totalWeightage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            {goals.length} goal{goals.length !== 1 ? "s" : ""} (max{" "}
            {GOAL_RULES.MAX_GOALS})
          </span>
          <span>Min {GOAL_RULES.MIN_WEIGHTAGE}% per goal</span>
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="text-sm font-semibold text-red-800 mb-2">
            Please fix the following issues:
          </h4>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Goal cards */}
      <div className="space-y-4">
        {goals.map((goal, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Goal header */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">
                  Goal {index + 1}
                </span>
                {goal.isShared && (
                  <span className="text-xs rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5">
                    Shared
                  </span>
                )}
              </div>
              {isEditable && goals.length > 1 && (
                <button
                  onClick={() => removeGoal(index)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>

            {/* Goal form */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Row 1: Thrust Area + Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Thrust Area <span className="text-red-500">*</span>
                  </label>
                  {isEditable ? (
                    <div className="relative">
                      <select
                        value={goal.thrustArea}
                        onChange={(e) =>
                          updateGoal(index, "thrustArea", e.target.value)
                        }
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-8"
                      >
                        <option value="">Select thrust area</option>
                        {THRUST_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 py-2">
                      {goal.thrustArea || "-"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  {isEditable && !goal.titleReadOnly ? (
                    <input
                      type="text"
                      value={goal.title}
                      onChange={(e) =>
                        updateGoal(index, "title", e.target.value)
                      }
                      placeholder="Enter goal title"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 py-2">
                      {goal.title || "-"}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Description
                </label>
                {isEditable ? (
                  <textarea
                    value={goal.description}
                    onChange={(e) =>
                      updateGoal(index, "description", e.target.value)
                    }
                    placeholder="Describe the goal in detail (optional)"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">
                    {goal.description || "No description provided"}
                  </p>
                )}
              </div>

              {/* Row 3: UoM, Target, Weightage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Unit of Measurement <span className="text-red-500">*</span>
                  </label>
                  {isEditable ? (
                    <div className="relative">
                      <select
                        value={goal.uomType}
                        onChange={(e) =>
                          updateGoal(index, "uomType", e.target.value)
                        }
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-8"
                      >
                        {UOM_TYPES.map((uom) => (
                          <option key={uom.value} value={uom.value}>
                            {uom.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 py-2">
                      {getUomLabel(goal.uomType)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Target <span className="text-red-500">*</span>
                  </label>
                  {isEditable && !goal.targetReadOnly ? (
                    <input
                      type={
                        goal.uomType === "TIMELINE" ? "date" : "text"
                      }
                      value={goal.target}
                      onChange={(e) =>
                        updateGoal(index, "target", e.target.value)
                      }
                      placeholder={
                        goal.uomType === "ZERO"
                          ? "0"
                          : goal.uomType.includes("PERCENT")
                            ? "e.g. 95"
                            : "Enter target value"
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 py-2">
                      {formatTarget(goal.uomType, goal.target)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Weightage (%) <span className="text-red-500">*</span>
                  </label>
                  {isEditable ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={goal.weightage || ""}
                      onChange={(e) =>
                        updateGoal(
                          index,
                          "weightage",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="Min 10%"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 py-2">
                      {goal.weightage}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add goal button */}
      {isEditable && goals.length < GOAL_RULES.MAX_GOALS && (
        <button
          onClick={addGoal}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-4 text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Goal ({goals.length}/{GOAL_RULES.MAX_GOALS})
        </button>
      )}

      {/* Bottom action bar (sticky) */}
      {isEditable && (
        <div className="sticky bottom-0 rounded-xl border border-gray-200 bg-white p-4 shadow-lg flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span
              className={`font-semibold ${
                totalWeightage === 100
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {totalWeightage}%
            </span>{" "}
            total weightage &middot; {goals.length} goal
            {goals.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || submitting}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || submitting}
            >
              <Send className="h-4 w-4 mr-1" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
