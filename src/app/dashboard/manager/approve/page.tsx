"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  Edit3,
  Save,
  Square,
  CheckSquare,
  Minus,
} from "lucide-react";
import { getUomLabel, formatTarget } from "@/lib/scoring";
import { GOAL_RULES } from "@/lib/validation";

const UOM_TYPES = [
  { value: "MIN_NUMERIC", label: "Numeric (Higher is better)" },
  { value: "MIN_PERCENT", label: "% (Higher is better)" },
  { value: "MAX_NUMERIC", label: "Numeric (Lower is better)" },
  { value: "MAX_PERCENT", label: "% (Lower is better)" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero-based" },
];

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
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showBulkReturnDialog, setShowBulkReturnDialog] = useState(false);
  const [bulkReturnComment, setBulkReturnComment] = useState("");

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
        setEditedGoals(sheet.goals.map((g) => ({ ...g })));
      } catch (err) {
        console.error("Load sheet error:", err);
        toast.error("Failed to load goal sheet");
      } finally {
        setLoading(false);
      }
    }

    loadSheet();
  }, [selectedSheetId]);

  const totalWeightage = editedGoals.reduce(
    (sum, g) => sum + g.weightage,
    0
  );

  function updateGoal(
    index: number,
    field: keyof GoalData,
    value: string | number
  ) {
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
            ? data.errors
                .map((e: { message: string }) => e.message)
                .join(", ")
            : data.error || "Failed to save"
        );
      }

      const updated = await res.json();
      setGoalSheet(updated);
      setEditedGoals(updated.goals.map((g: GoalData) => ({ ...g })));
      setIsEditing(false);
      toast.success("Goals updated successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save edits";
      toast.error(message);
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

      toast.success("Goal sheet approved successfully!");
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
        err instanceof Error ? err.message : "Failed to approve";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleReturn() {
    if (!goalSheet || !returnComment.trim()) {
      toast.error(
        "Please provide a comment explaining why the goal sheet is being returned."
      );
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
      toast.success("Goal sheet returned for revision");
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
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }

  function toggleBulkSelect(id: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (bulkSelected.size === submittedSheets.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(submittedSheets.map((s) => s.id)));
    }
  }

  async function handleBulkApprove() {
    if (bulkSelected.size === 0) return;
    setBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of bulkSelected) {
      try {
        const res = await fetch(`/api/goal-sheets/${id}/approve`, {
          method: "POST",
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setBulkSelected(new Set());
    setBulkProcessing(false);

    if (successCount > 0) {
      toast.success(`${successCount} goal sheet${successCount !== 1 ? "s" : ""} approved`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} sheet${failCount !== 1 ? "s" : ""} failed to approve`);
    }

    // Refresh data
    setSubmittedSheets((prev) =>
      prev.filter((s) => !bulkSelected.has(s.id))
    );
    const remaining = submittedSheets.filter((s) => !bulkSelected.has(s.id));
    if (remaining.length > 0) {
      setSelectedSheetId(remaining[0].id);
    } else {
      setSelectedSheetId(null);
      setGoalSheet(null);
    }
  }

  async function handleBulkReturn() {
    if (bulkSelected.size === 0 || !bulkReturnComment.trim()) {
      toast.error("Please provide a comment for returning the goal sheets.");
      return;
    }
    setBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of bulkSelected) {
      try {
        const res = await fetch(`/api/goal-sheets/${id}/return`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: bulkReturnComment.trim() }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    const selectedIds = new Set(bulkSelected);
    setBulkSelected(new Set());
    setBulkProcessing(false);
    setShowBulkReturnDialog(false);
    setBulkReturnComment("");

    if (successCount > 0) {
      toast.success(
        `${successCount} goal sheet${successCount !== 1 ? "s" : ""} returned for revision`
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} sheet${failCount !== 1 ? "s" : ""} failed to return`);
    }

    // Refresh data
    setSubmittedSheets((prev) => prev.filter((s) => !selectedIds.has(s.id)));
    const remaining = submittedSheets.filter((s) => !selectedIds.has(s.id));
    if (remaining.length > 0) {
      setSelectedSheetId(remaining[0].id);
    } else {
      setSelectedSheetId(null);
      setGoalSheet(null);
    }
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (submittedSheets.length === 0 && !goalSheet) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Approve Goals" },
          ]}
          title="Approve Goals"
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
          icon={CheckCircle2}
          title="All Caught Up!"
          description="There are no goal sheets pending your approval at this time."
          actionLabel="View Team"
          onAction={() => router.push("/dashboard/manager/team")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Approve Goals" },
        ]}
        title="Approve Goals"
        subtitle={
          goalSheet
            ? `Reviewing ${goalSheet.employee.name}'s goal sheet`
            : `${submittedSheets.length} sheet${submittedSheets.length !== 1 ? "s" : ""} pending approval`
        }
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

      {/* Bulk return comment dialog */}
      <Dialog
        open={showBulkReturnDialog}
        onOpenChange={(open) => {
          setShowBulkReturnDialog(open);
          if (!open) setBulkReturnComment("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return {bulkSelected.size} Sheet{bulkSelected.size !== 1 ? "s" : ""} for Revision</DialogTitle>
            <DialogDescription>
              This comment will be applied to all {bulkSelected.size} selected sheet{bulkSelected.size !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={bulkReturnComment}
            onChange={(e) => setBulkReturnComment(e.target.value)}
            placeholder="Enter your feedback..."
            rows={4}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowBulkReturnDialog(false);
                setBulkReturnComment("");
              }}
              disabled={bulkProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkReturn}
              disabled={bulkProcessing || !bulkReturnComment.trim()}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {bulkProcessing ? "Returning..." : "Return All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return comment dialog */}
      <Dialog
        open={showReturnDialog}
        onOpenChange={(open) => {
          setShowReturnDialog(open);
          if (!open) setReturnComment("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return for Revision</DialogTitle>
            <DialogDescription>
              Please provide feedback explaining what changes are needed.
              This comment will be visible to the employee.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={returnComment}
            onChange={(e) => setReturnComment(e.target.value)}
            placeholder="Enter your feedback..."
            rows={4}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
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
              size="sm"
              onClick={handleReturn}
              disabled={processing || !returnComment.trim()}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {processing ? "Returning..." : "Return for Rework"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet selector with checkboxes */}
      {submittedSheets.length > 1 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 bg-gray-50/80">
            <button
              onClick={toggleSelectAll}
              className="flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors"
              aria-label={bulkSelected.size === submittedSheets.length ? "Deselect all" : "Select all"}
            >
              {bulkSelected.size === submittedSheets.length ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : bulkSelected.size > 0 ? (
                <Minus className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <span className="text-[12px] text-gray-500 font-medium">
              {bulkSelected.size > 0
                ? `${bulkSelected.size} of ${submittedSheets.length} selected`
                : "Select sheets for bulk actions"}
            </span>
          </div>
          <Tabs
            value={selectedSheetId || undefined}
            onValueChange={(value) => {
              setSelectedSheetId(value as string);
              setIsEditing(false);
            }}
          >
            <div className="px-3">
              <TabsList variant="line">
                {submittedSheets.map((sheet) => (
                  <div key={sheet.id} className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBulkSelect(sheet.id);
                      }}
                      className="flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                      aria-label={bulkSelected.has(sheet.id) ? `Deselect ${sheet.employee.name}` : `Select ${sheet.employee.name}`}
                    >
                      {bulkSelected.has(sheet.id) ? (
                        <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <TabsTrigger value={sheet.id}>
                      <UserAvatar name={sheet.employee.name} size="xs" />
                      <span className="text-[13px]">{sheet.employee.name}</span>
                    </TabsTrigger>
                  </div>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
      )}

      {goalSheet && (
        <>
          {/* Compact employee info header */}
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar name={goalSheet.employee.name} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-gray-900">
                      {goalSheet.employee.name}
                    </p>
                    <StatusBadge status={goalSheet.status} />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {goalSheet.employee.email}
                    {goalSheet.employee.department &&
                      ` · ${goalSheet.employee.department}`}
                    {" · "}
                    {goalSheet.cycle.name}
                    {goalSheet.submittedAt && (
                      <>
                        {" · Submitted "}
                        {new Date(
                          goalSheet.submittedAt
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </p>
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
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-gray-700">
                Total Weightage
              </span>
              <span
                className={`text-[13px] font-bold ${
                  totalWeightage === 100
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {totalWeightage}% / 100%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
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
            <p className="text-[11px] text-gray-500 mt-1">
              {editedGoals.length} goals · Min {GOAL_RULES.MIN_WEIGHTAGE}%
              per goal · Max {GOAL_RULES.MAX_GOALS} goals
            </p>
          </div>

          {/* Goals list */}
          <div className="space-y-2">
            {(isEditing ? editedGoals : goalSheet.goals)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((goal, index) => (
                <div
                  key={goal.id || index}
                  className="rounded-lg border border-gray-200 bg-white overflow-hidden"
                >
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-100">
                    <span className="text-[13px] font-semibold text-gray-700">
                      Goal {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 font-medium">
                        {goal.thrustArea}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {goal.weightage}% weight
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5">
                    {isEditing ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={editedGoals[index]?.title || ""}
                              onChange={(e) =>
                                updateGoal(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                              disabled={goal.titleReadOnly}
                              className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] disabled:bg-gray-50 disabled:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Target
                            </label>
                            <input
                              type={
                                goal.uomType === "TIMELINE"
                                  ? "date"
                                  : "text"
                              }
                              value={editedGoals[index]?.target || ""}
                              onChange={(e) =>
                                updateGoal(
                                  index,
                                  "target",
                                  e.target.value
                                )
                              }
                              disabled={goal.targetReadOnly}
                              className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] disabled:bg-gray-50 disabled:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
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
                                className="w-full appearance-none rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200 pr-8"
                              >
                                {UOM_TYPES.map((u) => (
                                  <option key={u.value} value={u.value}>
                                    {u.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
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
                              className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h4 className="text-[13px] font-medium text-gray-900">
                            {goal.title}
                          </h4>
                          {goal.description && (
                            <p className="text-[13px] text-gray-500 mt-0.5">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[13px] text-gray-600">
                          <span>
                            <span className="text-[11px] text-gray-400">
                              UoM:{" "}
                            </span>
                            {getUomLabel(goal.uomType)}
                          </span>
                          <span>
                            <span className="text-[11px] text-gray-400">
                              Target:{" "}
                            </span>
                            {formatTarget(goal.uomType, goal.target)}
                          </span>
                          <span>
                            <span className="text-[11px] text-gray-400">
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
            <div className="sticky bottom-0 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg flex items-center justify-between">
              <p className="text-[13px] text-gray-600">
                Review complete? Choose an action below.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowReturnDialog(true)}
                  disabled={processing}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Return for Rework
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={processing}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {processing ? "Processing..." : "Approve Goals"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating bulk action bar */}
      {bulkSelected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
            {bulkSelected.size} selected
          </span>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={bulkProcessing}
            className="bg-blue-700 text-white hover:bg-blue-800"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {bulkProcessing ? "Processing..." : "Approve All"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkReturnDialog(true)}
            disabled={bulkProcessing}
            className="bg-white text-red-600 border-red-200 hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Return All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkSelected(new Set())}
            disabled={bulkProcessing}
            className="text-gray-500"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ManagerApprovePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManagerApproveContent />
    </Suspense>
  );
}
