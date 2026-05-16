"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Plus,
  Loader2,
  X,
  Play,
  CheckCircle2,
  Clock,
  Shield,
  Settings,
  Bell,
  XCircle,
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

type ActiveTab = "rules" | "escalations";

export default function EscalationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("rules");
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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
          // If API returns flat array, treat as escalations
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
    setError("");
    setShowDialog(true);
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

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
      setSuccessMsg("Escalation rule created successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create rule"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRunCheck() {
    setRunning(true);
    setError("");

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
      setSuccessMsg(
        `Escalation check completed. ${data.triggered || 0} new escalations triggered.`
      );
      setTimeout(() => setSuccessMsg(""), 5000);
      fetchData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to run escalation check"
      );
      setTimeout(() => setError(""), 5000);
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
      if (res.ok) fetchData();
    } catch {
      // silent
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: "bg-red-50 text-red-700 border-red-200",
      ACKNOWLEDGED: "bg-amber-50 text-amber-700 border-amber-200",
      RESOLVED: "bg-green-50 text-green-700 border-green-200",
    };
    const icons: Record<string, React.ReactNode> = {
      OPEN: <AlertTriangle className="h-3 w-3" />,
      ACKNOWLEDGED: <Clock className="h-3 w-3" />,
      RESOLVED: <CheckCircle2 className="h-3 w-3" />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}
      >
        {icons[status]}
        {status}
      </span>
    );
  };

  const ruleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GOAL_SHEET_NOT_SUBMITTED: "Goal Sheet Not Submitted",
      GOAL_SHEET_NOT_APPROVED: "Goal Sheet Not Approved",
      QUARTERLY_NOT_UPDATED: "Quarterly Achievement Not Updated",
    };
    return labels[type] || type;
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
      {/* Success/Error toasts */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Escalation Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure escalation rules and monitor triggered escalations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRunCheck}
            disabled={running}
            variant="outline"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Play className="h-4 w-4 mr-1.5" />
            )}
            Run Check
          </Button>
          <Button
            onClick={openCreateRule}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "rules"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Settings className="h-4 w-4 inline mr-1.5" />
          Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab("escalations")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "escalations"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Bell className="h-4 w-4 inline mr-1.5" />
          Escalations ({escalations.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : activeTab === "rules" ? (
        /* Rules Tab */
        rules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No escalation rules
            </h3>
            <p className="text-gray-500 mt-1">
              Create your first escalation rule to automate follow-ups
            </p>
            <Button
              onClick={openCreateRule}
              className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Rule
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${rule.isActive ? "bg-green-50" : "bg-gray-100"}`}
                    >
                      <Shield
                        className={`h-5 w-5 ${rule.isActive ? "text-green-600" : "text-gray-400"}`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {ruleTypeLabel(rule.type)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Trigger after {rule.daysThreshold} days
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        rule.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRule(rule)}
                    >
                      {rule.isActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      Type
                    </div>
                    <div className="text-gray-900">{rule.type}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      Days Threshold
                    </div>
                    <div className="text-gray-900">
                      {rule.daysThreshold} days
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      Escalation Levels
                    </div>
                    <div className="text-gray-900">
                      {rule.escalationLevels}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : /* Escalations Tab */
      escalations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            No active escalations
          </h3>
          <p className="text-gray-500 mt-1">
            All employees are on track. Run a check to verify.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Rule
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Cycle
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Level
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Triggered
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Resolved
                  </th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((esc) => (
                  <tr
                    key={esc.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {esc.targetUser?.name || esc.targetUserId}
                        </div>
                        {esc.targetUser?.email && (
                          <div className="text-xs text-gray-500">
                            {esc.targetUser.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {esc.rule
                        ? ruleTypeLabel(esc.rule.type)
                        : esc.ruleId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {esc.cycle?.name || esc.cycleId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                        {esc.currentLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(esc.status)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(esc.triggeredAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {esc.resolvedAt
                        ? new Date(esc.resolvedAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Rule Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Escalation Rule
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-6 space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Rule Type
                </label>
                <select
                  value={ruleForm.type}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, type: e.target.value })
                  }
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Days Threshold
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={ruleForm.daysThreshold}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      daysThreshold: e.target.value,
                    })
                  }
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of days past the deadline before escalation triggers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Escalation Levels
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.escalationLevels}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      escalationLevels: e.target.value,
                    })
                  }
                  placeholder="MANAGER,ADMIN"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
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
                  className="text-sm text-gray-700"
                >
                  Rule is active
                </label>
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
                    "Create Rule"
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
