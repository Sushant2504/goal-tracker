"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
  Loader2,
  Play,
  Shield,
  Settings,
  Bell,
} from "lucide-react";

interface EscalationRule {
  id: string;
  type: string;
  daysThreshold: number;
  escalationLevels: string;
  isActive: boolean;
  createdAt: string;
}

interface Escalation {
  id: string;
  ruleId: string;
  rule?: EscalationRule;
  targetUserId: string;
  targetUser?: { name: string; email: string };
  cycleId: string;
  cycle?: { name: string };
  currentLevel: number;
  status: string;
  triggeredAt: string;
  resolvedAt?: string | null;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  GOAL_SHEET_NOT_SUBMITTED: "Goal Sheet Not Submitted",
  GOAL_SHEET_NOT_APPROVED: "Goal Sheet Not Approved",
  QUARTERLY_NOT_UPDATED: "Quarterly Achievement Not Updated",
};

export default function EscalationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("rules");
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [formError, setFormError] = useState("");
  const [ruleForm, setRuleForm] = useState({
    type: "GOAL_SHEET_NOT_SUBMITTED",
    daysThreshold: "7",
    escalationLevels: "MANAGER,ADMIN",
    isActive: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/escalations");
      if (res.ok) {
        const data = await res.json();
        if (data.rules) setRules(data.rules);
        if (data.escalations) setEscalations(data.escalations);
        if (Array.isArray(data)) {
          setEscalations(data);
        }
      }
    } catch {
      // silent
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

  function openCreateRule() {
    setRuleForm({
      type: "GOAL_SHEET_NOT_SUBMITTED",
      daysThreshold: "7",
      escalationLevels: "MANAGER,ADMIN",
      isActive: true,
    });
    setFormError("");
    setShowDialog(true);
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createRule",
          type: ruleForm.type,
          daysThreshold: parseInt(ruleForm.daysThreshold),
          escalationLevels: ruleForm.escalationLevels,
          isActive: ruleForm.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create rule");
      }

      setShowDialog(false);
      toast.success("Escalation rule created successfully");
      fetchData();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create rule"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRunCheck() {
    setRunning(true);

    try {
      const res = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "runCheck" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to run escalation check");
      }

      const data = await res.json();
      toast.success(
        `Escalation check completed. ${data.triggered || 0} new escalations triggered.`
      );
      fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to run escalation check"
      );
    } finally {
      setRunning(false);
    }
  }

  async function toggleRule(rule: EscalationRule) {
    try {
      const res = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleRule",
          ruleId: rule.id,
          isActive: !rule.isActive,
        }),
      });
      if (res.ok) {
        toast.success(
          rule.isActive ? "Rule disabled" : "Rule enabled"
        );
        fetchData();
      }
    } catch {
      toast.error("Failed to toggle rule");
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
          { label: "Escalations" },
        ]}
        title="Escalation Management"
        subtitle="Configure escalation rules and monitor triggered escalations"
        actions={
          <>
            <Button
              onClick={handleRunCheck}
              disabled={running}
              variant="outline"
              size="sm"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1" />
              )}
              Run Check
            </Button>
            <Button onClick={openCreateRule} size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Rule
            </Button>
          </>
        }
      />

      <Tabs
        defaultValue="rules"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as string)}
      >
        <TabsList>
          <TabsTrigger value="rules">
            <Settings className="h-3.5 w-3.5 mr-1" />
            Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="escalations">
            <Bell className="h-3.5 w-3.5 mr-1" />
            Escalations ({escalations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          {loading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No escalation rules"
              description="Create your first escalation rule to automate follow-ups."
              actionLabel="Create Rule"
              onAction={openCreateRule}
            />
          ) : (
            <div className="grid gap-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-md ${
                          rule.isActive ? "bg-emerald-50" : "bg-gray-100"
                        }`}
                      >
                        <Shield
                          className={`h-4 w-4 ${
                            rule.isActive
                              ? "text-emerald-600"
                              : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-gray-900">
                          {RULE_TYPE_LABELS[rule.type] || rule.type}
                        </h3>
                        <p className="text-[11px] text-gray-400">
                          Trigger after {rule.daysThreshold} days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={rule.isActive ? "ACTIVE" : "CLOSED"}
                      />
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => toggleRule(rule)}
                      >
                        {rule.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                      <div className="text-[11px] font-medium text-gray-400 mb-0.5">
                        Type
                      </div>
                      <div className="text-gray-700">{rule.type}</div>
                    </div>
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                      <div className="text-[11px] font-medium text-gray-400 mb-0.5">
                        Days Threshold
                      </div>
                      <div className="text-gray-700">
                        {rule.daysThreshold} days
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                      <div className="text-[11px] font-medium text-gray-400 mb-0.5">
                        Escalation Levels
                      </div>
                      <div className="text-gray-700">
                        {rule.escalationLevels}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="escalations">
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : escalations.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No active escalations"
              description="All employees are on track. Run a check to verify."
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                      Employee
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                      Rule
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                      Cycle
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3 text-center">
                      Level
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                      Triggered
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                      Resolved
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalations.map((esc) => (
                    <TableRow key={esc.id}>
                      <TableCell className="py-2 px-3">
                        <div className="text-[13px] font-medium text-gray-900">
                          {esc.targetUser?.name || esc.targetUserId}
                        </div>
                        {esc.targetUser?.email && (
                          <div className="text-[11px] text-gray-400">
                            {esc.targetUser.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2 px-3 text-[13px] text-gray-600">
                        {esc.rule
                          ? RULE_TYPE_LABELS[esc.rule.type] || esc.rule.type
                          : esc.ruleId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="py-2 px-3 text-[13px] text-gray-600">
                        {esc.cycle?.name || esc.cycleId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="py-2 px-3 text-center">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
                          {esc.currentLevel}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-3 text-center">
                        <StatusBadge status={esc.status} />
                      </TableCell>
                      <TableCell className="py-2 px-3 text-[13px] text-gray-600 whitespace-nowrap">
                        {new Date(esc.triggeredAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-2 px-3 text-[13px] text-gray-600 whitespace-nowrap">
                        {esc.resolvedAt
                          ? new Date(esc.resolvedAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Rule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Escalation Rule</DialogTitle>
            <DialogDescription>
              Define when and how escalations should be triggered.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRule} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Rule Type
              </label>
              <select
                value={ruleForm.type}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, type: e.target.value })
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="GOAL_SHEET_NOT_SUBMITTED">
                  Goal Sheet Not Submitted
                </option>
                <option value="GOAL_SHEET_NOT_APPROVED">
                  Goal Sheet Not Approved
                </option>
                <option value="QUARTERLY_NOT_UPDATED">
                  Quarterly Achievement Not Updated
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Days Threshold
              </label>
              <Input
                type="number"
                required
                min={1}
                value={ruleForm.daysThreshold}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    daysThreshold: e.target.value,
                  })
                }
              />
              <p className="text-[11px] text-gray-400 mt-0.5">
                Days past the deadline before escalation triggers
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Escalation Levels
              </label>
              <Input
                required
                value={ruleForm.escalationLevels}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    escalationLevels: e.target.value,
                  })
                }
                placeholder="MANAGER,ADMIN"
              />
              <p className="text-[11px] text-gray-400 mt-0.5">
                Comma-separated levels (e.g., MANAGER,ADMIN)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={ruleForm.isActive}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    isActive: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="isActive"
                className="text-[13px] text-gray-700"
              >
                Rule is active
              </label>
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
                Create Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
