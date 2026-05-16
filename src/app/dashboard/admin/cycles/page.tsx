"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Plus,
  Pencil,
  Loader2,
  X,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";

interface GoalCycle {
  id: string;
  name: string;
  goalSettingOpens: string;
  goalSettingCloses: string;
  q1Opens: string;
  q1Closes: string;
  q2Opens: string;
  q2Closes: string;
  q3Opens: string;
  q3Closes: string;
  q4Opens: string;
  q4Closes: string;
  status: string;
  createdAt: string;
}

const emptyForm = {
  name: "",
  goalSettingOpens: "",
  goalSettingCloses: "",
  q1Opens: "",
  q1Closes: "",
  q2Opens: "",
  q2Closes: "",
  q3Opens: "",
  q3Closes: "",
  q4Opens: "",
  q4Closes: "",
  status: "DRAFT",
};

function toInputDate(iso: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function CyclesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [cycles, setCycles] = useState<GoalCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cycles");
      if (res.ok) {
        const data = await res.json();
        setCycles(data);
      }
    } catch {
      setError("Failed to load cycles");
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
      fetchCycles();
    }
  }, [authStatus, router, fetchCycles]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowDialog(true);
  }

  function openEdit(cycle: GoalCycle) {
    setEditingId(cycle.id);
    setForm({
      name: cycle.name,
      goalSettingOpens: toInputDate(cycle.goalSettingOpens),
      goalSettingCloses: toInputDate(cycle.goalSettingCloses),
      q1Opens: toInputDate(cycle.q1Opens),
      q1Closes: toInputDate(cycle.q1Closes),
      q2Opens: toInputDate(cycle.q2Opens),
      q2Closes: toInputDate(cycle.q2Closes),
      q3Opens: toInputDate(cycle.q3Opens),
      q3Closes: toInputDate(cycle.q3Closes),
      q4Opens: toInputDate(cycle.q4Opens),
      q4Closes: toInputDate(cycle.q4Closes),
      status: cycle.status,
    });
    setError("");
    setShowDialog(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await fetch("/api/admin/cycles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save cycle");
      }

      setShowDialog(false);
      fetchCycles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save cycle");
    } finally {
      setSaving(false);
    }
  }

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "DRAFT":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "CLOSED":
        return <Archive className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "DRAFT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goal Cycles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage performance review cycles and their quarterly windows
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Cycle
        </Button>
      </div>

      {/* Cycles List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : cycles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No cycles yet</h3>
          <p className="text-gray-500 mt-1">
            Create your first goal cycle to get started
          </p>
          <Button
            onClick={openCreate}
            className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Cycle
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <CalendarDays className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cycle.name}</h3>
                    <p className="text-xs text-gray-500">
                      Created {new Date(cycle.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadgeClass(cycle.status)}`}
                  >
                    {statusIcon(cycle.status)}
                    {cycle.status}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => openEdit(cycle)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Goal Setting
                  </div>
                  <div className="text-gray-900">
                    {new Date(cycle.goalSettingOpens).toLocaleDateString()} -{" "}
                    {new Date(cycle.goalSettingCloses).toLocaleDateString()}
                  </div>
                </div>
                {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                  <div key={q} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {q.toUpperCase()}
                    </div>
                    <div className="text-gray-900">
                      {new Date(
                        cycle[`${q}Opens` as keyof GoalCycle] as string
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {new Date(
                        cycle[`${q}Closes` as keyof GoalCycle] as string
                      ).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Cycle" : "Create New Cycle"}
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
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Cycle Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="FY 2026-27"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => updateForm("status", e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Goal Setting Window
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Opens
                    </label>
                    <input
                      type="date"
                      required
                      value={form.goalSettingOpens}
                      onChange={(e) =>
                        updateForm("goalSettingOpens", e.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Closes
                    </label>
                    <input
                      type="date"
                      required
                      value={form.goalSettingCloses}
                      onChange={(e) =>
                        updateForm("goalSettingCloses", e.target.value)
                      }
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                <div key={q}>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {q.toUpperCase()} Achievement Window
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Opens
                      </label>
                      <input
                        type="date"
                        required
                        value={form[`${q}Opens` as keyof typeof form]}
                        onChange={(e) =>
                          updateForm(`${q}Opens`, e.target.value)
                        }
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Closes
                      </label>
                      <input
                        type="date"
                        required
                        value={form[`${q}Closes` as keyof typeof form]}
                        onChange={(e) =>
                          updateForm(`${q}Closes`, e.target.value)
                        }
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

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
                      Saving...
                    </>
                  ) : editingId ? (
                    "Update Cycle"
                  ) : (
                    "Create Cycle"
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
