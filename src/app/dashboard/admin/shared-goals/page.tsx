"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Users,
  Target,
  Search,
  Share2,
} from "lucide-react";

interface SharedGoal {
  id: string;
  thrustArea: string;
  title: string;
  description?: string;
  uomType: string;
  target: number;
  weightage: number;
  employees?: { id: string; name: string; email: string }[];
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

export default function SharedGoalsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [formError, setFormError] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [form, setForm] = useState({
    thrustArea: "",
    title: "",
    description: "",
    uomType: "PERCENTAGE",
    target: "",
    weightage: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, usersRes] = await Promise.all([
        fetch("/api/admin/shared-goals"),
        fetch("/api/admin/users?role=EMPLOYEE"),
      ]);
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setSharedGoals(Array.isArray(data) ? data : data.goals || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setEmployees(Array.isArray(data) ? data : data.users || []);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchData();
    }
  }, [authStatus, router, fetchData]);

  function openCreate() {
    setForm({
      thrustArea: "",
      title: "",
      description: "",
      uomType: "PERCENTAGE",
      target: "",
      weightage: "",
    });
    setSelectedEmployees([]);
    setEmployeeSearch("");
    setFormError("");
    setShowDialog(true);
  }

  function toggleEmployee(id: string) {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedEmployees(filteredEmployees.map((e) => e.id));
  }

  function deselectAll() {
    setSelectedEmployees([]);
  }

  const filteredEmployees = employees.filter((e) => {
    if (!employeeSearch) return true;
    const q = employeeSearch.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      setFormError("Please select at least one employee");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/shared-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          target: parseFloat(form.target),
          weightage: parseFloat(form.weightage),
          employeeIds: selectedEmployees,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create shared goal");
      }

      setShowDialog(false);
      toast.success("Shared goal created successfully");
      fetchData();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create shared goal"
      );
    } finally {
      setSaving(false);
    }
  }

  if (authStatus === "loading") {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Shared Goals" },
        ]}
        title="Shared Goals"
        subtitle="Create and manage goals shared across multiple employees"
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Shared Goal
          </Button>
        }
      />

      {loading ? (
        <PageSkeleton />
      ) : sharedGoals.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No shared goals yet"
          description="Create a shared goal to assign it to multiple employees."
          actionLabel="Create Shared Goal"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sharedGoals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50">
                    <Target className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-gray-900 truncate">
                      {goal.title}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {goal.thrustArea}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <StatusBadge status={goal.uomType} />
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  Target: {goal.target}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Weight: {goal.weightage}%
                </span>
              </div>

              {goal.description && (
                <p className="text-[13px] text-gray-500 mb-2.5 line-clamp-2">
                  {goal.description}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-500">
                  {goal.employees?.length || 0} employee
                  {(goal.employees?.length || 0) !== 1 ? "s" : ""}
                </span>
                {goal.employees && goal.employees.length > 0 && (
                  <div className="flex -space-x-1.5 ml-1">
                    {goal.employees.slice(0, 4).map((emp) => (
                      <UserAvatar
                        key={emp.id}
                        name={emp.name}
                        size="xs"
                        className="ring-2 ring-white"
                      />
                    ))}
                    {goal.employees.length > 4 && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-600 ring-2 ring-white">
                        +{goal.employees.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Shared Goal</DialogTitle>
            <DialogDescription>
              Define a goal and assign it to multiple employees at once.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Thrust Area
                </label>
                <Input
                  required
                  value={form.thrustArea}
                  onChange={(e) =>
                    setForm({ ...form, thrustArea: e.target.value })
                  }
                  placeholder="e.g., Revenue Growth"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Title
                </label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Goal title"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                placeholder="Describe the shared goal..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Unit of Measure
                </label>
                <select
                  value={form.uomType}
                  onChange={(e) =>
                    setForm({ ...form, uomType: e.target.value })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="NUMBER">Number</option>
                  <option value="CURRENCY">Currency</option>
                  <option value="BOOLEAN">Yes/No</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Target
                </label>
                <Input
                  type="number"
                  required
                  step="any"
                  value={form.target}
                  onChange={(e) =>
                    setForm({ ...form, target: e.target.value })
                  }
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Weightage (%)
                </label>
                <Input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={form.weightage}
                  onChange={(e) =>
                    setForm({ ...form, weightage: e.target.value })
                  }
                  placeholder="20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Assign to Employees ({selectedEmployees.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-[11px] text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                />
              </div>
              <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="p-3 text-center text-[13px] text-gray-400">
                    No employees found
                  </div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-gray-900 truncate">
                          {emp.name}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {emp.email}
                          {emp.department ? ` - ${emp.department}` : ""}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                )}
                Create Shared Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
