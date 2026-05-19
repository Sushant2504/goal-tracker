"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Pencil,
  Loader2,
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

function formatDate(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const [formError, setFormError] = useState("");

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cycles");
      if (res.ok) {
        const data = await res.json();
        setCycles(data);
      }
    } catch {
      toast.error("Failed to load cycles");
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
    setFormError("");
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
    setFormError("");
    setShowDialog(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

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
      toast.success(editingId ? "Cycle updated" : "Cycle created");
      fetchCycles();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save cycle");
    } finally {
      setSaving(false);
    }
  }

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (authStatus === "loading") {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Goal Cycles" },
        ]}
        title="Goal Cycles"
        subtitle="Manage performance review cycles and their quarterly windows"
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Cycle
          </Button>
        }
      />

      {loading ? (
        <PageSkeleton />
      ) : cycles.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No cycles yet"
          description="Create your first goal cycle to get started."
          actionLabel="Create Cycle"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-3">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-900">
                      {cycle.name}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Created{" "}
                      {new Date(cycle.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={cycle.status} />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => openEdit(cycle)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[13px]">
                <div className="bg-gray-50 rounded-md px-3 py-2">
                  <div className="text-[11px] font-medium text-gray-400 mb-0.5">
                    Goal Setting
                  </div>
                  <div className="text-gray-700">
                    {formatDate(cycle.goalSettingOpens)} -{" "}
                    {formatDate(cycle.goalSettingCloses)}
                  </div>
                </div>
                {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                  <div key={q} className="bg-gray-50 rounded-md px-3 py-2">
                    <div className="text-[11px] font-medium text-gray-400 mb-0.5">
                      {q.toUpperCase()}
                    </div>
                    <div className="text-gray-700">
                      {formatDate(
                        cycle[`${q}Opens` as keyof GoalCycle] as string
                      )}{" "}
                      -{" "}
                      {formatDate(
                        cycle[`${q}Closes` as keyof GoalCycle] as string
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Cycle" : "Create New Cycle"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update cycle details and date windows."
                : "Define a new goal cycle with quarterly windows."}
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
                  Cycle Name
                </label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="FY 2026-27"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Goal Setting Window
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-0.5">
                    Opens
                  </label>
                  <Input
                    type="date"
                    required
                    value={form.goalSettingOpens}
                    onChange={(e) =>
                      updateForm("goalSettingOpens", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-0.5">
                    Closes
                  </label>
                  <Input
                    type="date"
                    required
                    value={form.goalSettingCloses}
                    onChange={(e) =>
                      updateForm("goalSettingCloses", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {(["q1", "q2", "q3", "q4"] as const).map((q) => (
              <div key={q}>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  {q.toUpperCase()} Achievement Window
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">
                      Opens
                    </label>
                    <Input
                      type="date"
                      required
                      value={form[`${q}Opens` as keyof typeof form]}
                      onChange={(e) =>
                        updateForm(`${q}Opens`, e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">
                      Closes
                    </label>
                    <Input
                      type="date"
                      required
                      value={form[`${q}Closes` as keyof typeof form]}
                      onChange={(e) =>
                        updateForm(`${q}Closes`, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

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
                {editingId ? "Update Cycle" : "Create Cycle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
