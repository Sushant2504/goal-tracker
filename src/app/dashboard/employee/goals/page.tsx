"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Send,
  AlertCircle,
  ChevronDown,
  GripVertical,
  Target,
  Info,
} from "lucide-react";
import {
  validateGoals,
  GOAL_RULES,
  type ValidationError,
} from "@/lib/validation";
import { getUomLabel, formatTarget } from "@/lib/scoring";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeCycle, setActiveCycle] = useState<GoalCycle | null>(null);
  const [goalSheet, setGoalSheet] = useState<GoalSheet | null>(null);
  const [goals, setGoals] = useState<GoalFormData[]>([emptyGoal(0)]);
  const [errors, setErrors] = useState<ValidationError[]>([]);

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
        toast.error("Failed to load data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user?.id]);

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
      toast.error(`Maximum ${GOAL_RULES.MAX_GOALS} goals allowed`);
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
      toast.error(message);
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
          toast.error("Please fix validation errors");
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
      toast.success("Goals saved as draft");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save goals";
      toast.error(message);
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
      toast.error("Please fix all validation errors before submitting");
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
          toast.error("Please fix validation errors");
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
          toast.error("Validation errors during submission");
          return;
        }
        throw new Error(data.error || "Failed to submit");
      }

      const submitted = await submitRes.json();
      setGoalSheet(submitted);
      setErrors([]);
      toast.success("Goal sheet submitted for approval!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (!activeCycle) {
    return (
      <div className="space-y-1">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "My Goals" },
          ]}
          title="My Goals"
        />
        <EmptyState
          icon={AlertCircle}
          title="No Active Goal Cycle"
          description="There is no active goal cycle at the moment. Please check back later or contact your administrator."
        />
      </div>
    );
  }

  const sheetStatus = goalSheet?.status || "DRAFT";

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Goals" },
        ]}
        title="My Goals"
        subtitle={activeCycle.name}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={sheetStatus} />
            {isEditable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || submitting}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={saving || submitting}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Weightage progress bar - compact */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Target className="h-4 w-4 text-gray-400" />
          <span className="text-[13px] font-medium text-gray-600">Weightage</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
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
        <span
          className={`text-[13px] font-semibold tabular-nums shrink-0 ${
            totalWeightage === 100
              ? "text-emerald-600"
              : totalWeightage > 100
                ? "text-red-600"
                : "text-amber-600"
          }`}
        >
          {totalWeightage}%
        </span>
        <span className="text-[11px] text-gray-400 shrink-0">
          {goals.length}/{GOAL_RULES.MAX_GOALS} goals
        </span>
      </div>

      {/* Return comment banner */}
      {goalSheet?.status === "RETURNED" && goalSheet.returnComment && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-red-800">
                Returned for Revision
              </p>
              <p className="text-[13px] text-red-700 mt-0.5">
                {goalSheet.returnComment}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-[13px] text-blue-700">
              {goalSheet?.status === "SUBMITTED"
                ? "Your goal sheet has been submitted and is pending manager approval. Goals cannot be edited."
                : "Your goal sheet has been approved. Goals are locked."}
            </p>
          </div>
        </div>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[13px] font-semibold text-red-800 mb-1.5">
            Please fix the following issues:
          </p>
          <ul className="space-y-0.5">
            {errors.map((err, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[13px] text-red-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Goal cards */}
      <div className="space-y-3">
        {goals.map((goal, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Goal header - compact */}
            <div className="flex items-center justify-between bg-gray-50/80 px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                <span className="text-[13px] font-semibold text-gray-700">
                  Goal {index + 1}
                </span>
                {goal.isShared && (
                  <StatusBadge status="SUBMITTED" className="text-[10px]" />
                )}
                {goal.weightage > 0 && (
                  <span className="text-[11px] text-gray-400 ml-1">
                    {goal.weightage}% weight
                  </span>
                )}
              </div>
              {isEditable && goals.length > 1 && (
                <button
                  onClick={() => removeGoal(index)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>

            {/* Goal form - compact */}
            <div className="px-3 py-3 space-y-3">
              {/* Row 1: Thrust Area + Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Thrust Area <span className="text-red-500">*</span>
                  </label>
                  {isEditable ? (
                    <div className="relative">
                      <select
                        value={goal.thrustArea}
                        onChange={(e) =>
                          updateGoal(index, "thrustArea", e.target.value)
                        }
                        className="w-full h-8 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-[13px] text-gray-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 pr-8"
                      >
                        <option value="">Select thrust area</option>
                        {THRUST_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-900 py-1.5">
                      {goal.thrustArea || "-"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  {isEditable && !goal.titleReadOnly ? (
                    <Input
                      value={goal.title}
                      onChange={(e) =>
                        updateGoal(index, "title", e.target.value)
                      }
                      placeholder="Enter goal title"
                      className="text-[13px]"
                    />
                  ) : (
                    <p className="text-[13px] text-gray-900 py-1.5">
                      {goal.title || "-"}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </label>
                {isEditable ? (
                  <Textarea
                    value={goal.description}
                    onChange={(e) =>
                      updateGoal(index, "description", e.target.value)
                    }
                    placeholder="Describe the goal in detail (optional)"
                    rows={2}
                    className="text-[13px] min-h-[56px] resize-none"
                  />
                ) : (
                  <p className="text-[13px] text-gray-600 py-1.5">
                    {goal.description || "No description provided"}
                  </p>
                )}
              </div>

              {/* Row 3: UoM, Target, Weightage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Unit of Measurement <span className="text-red-500">*</span>
                  </label>
                  {isEditable ? (
                    <div className="relative">
                      <select
                        value={goal.uomType}
                        onChange={(e) =>
                          updateGoal(index, "uomType", e.target.value)
                        }
                        className="w-full h-8 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-[13px] text-gray-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 pr-8"
                      >
                        {UOM_TYPES.map((uom) => (
                          <option key={uom.value} value={uom.value}>
                            {uom.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-900 py-1.5">
                      {getUomLabel(goal.uomType)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Target <span className="text-red-500">*</span>
                  </label>
                  {isEditable && !goal.targetReadOnly ? (
                    <Input
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
                      className="text-[13px]"
                    />
                  ) : (
                    <p className="text-[13px] text-gray-900 py-1.5">
                      {formatTarget(goal.uomType, goal.target)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Weightage (%) <span className="text-red-500">*</span>
                  </label>
                  {isEditable ? (
                    <Input
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
                      className="text-[13px]"
                    />
                  ) : (
                    <p className="text-[13px] text-gray-900 py-1.5">
                      {goal.weightage}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add goal button - compact text button */}
      {isEditable && goals.length < GOAL_RULES.MAX_GOALS && (
        <button
          onClick={addGoal}
          className="flex items-center gap-1 text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors px-1 py-0.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add goal
        </button>
      )}

      {/* Bottom action bar (sticky) */}
      {isEditable && (
        <div className="sticky bottom-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-lg flex items-center justify-between">
          <div className="text-[13px] text-gray-500">
            <span
              className={`font-semibold ${
                totalWeightage === 100
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {totalWeightage}%
            </span>{" "}
            total weightage · {goals.length} goal
            {goals.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || submitting}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving || submitting}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
