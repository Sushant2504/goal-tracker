"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Plus,
  Loader2,
  X,
  Users,
  Target,
  CheckCircle2,
  Search,
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
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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
      setError("Failed to load data");
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
    setError("");
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
      setError("Please select at least one employee");
      return;
    }
    setSaving(true);
    setError("");

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
      setSuccessMsg("Shared goal created successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create shared goal"
      );
    } finally {
      setSaving(false);
    }
  }

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle2 className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Goals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage goals that are shared across multiple employees
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Shared Goal
        </Button>
      </div>

      {/* Shared Goals List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : sharedGoals.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            No shared goals yet
          </h3>
          <p className="text-gray-500 mt-1">
            Create a shared goal to assign it to multiple employees
          </p>
          <Button
            onClick={openCreate}
            className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Shared Goal
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sharedGoals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Target className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {goal.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Thrust Area: {goal.thrustArea}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {goal.uomType}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                    Target: {goal.target}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Weight: {goal.weightage}%
                  </span>
                </div>
              </div>

              {goal.description && (
                <p className="text-sm text-gray-600 mb-3">
                  {goal.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>
                  {goal.employees?.length || 0} employee
                  {(goal.employees?.length || 0) !== 1 ? "s" : ""}
                </span>
                {goal.employees && goal.employees.length > 0 && (
                  <span className="text-gray-400">
                    ({goal.employees.map((e) => e.name).join(", ")})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Shared Goal
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Thrust Area
                  </label>
                  <input
                    type="text"
                    required
                    value={form.thrustArea}
                    onChange={(e) =>
                      setForm({ ...form, thrustArea: e.target.value })
                    }
                    placeholder="e.g., Revenue Growth"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="Goal title"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe the shared goal..."
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unit of Measure
                  </label>
                  <select
                    value={form.uomType}
                    onChange={(e) =>
                      setForm({ ...form, uomType: e.target.value })
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="NUMBER">Number</option>
                    <option value="CURRENCY">Currency</option>
                    <option value="BOOLEAN">Yes/No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Target
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={form.target}
                    onChange={(e) =>
                      setForm({ ...form, target: e.target.value })
                    }
                    placeholder="100"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Weightage (%)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={form.weightage}
                    onChange={(e) =>
                      setForm({ ...form, weightage: e.target.value })
                    }
                    placeholder="20"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Assign to Employees ({selectedEmployees.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {emp.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {emp.email}
                            {emp.department ? ` - ${emp.department}` : ""}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Creating...
                    </>
                  ) : (
                    "Create Shared Goal"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
