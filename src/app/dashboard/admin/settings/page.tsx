"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Loader2,
  Save,
  CheckCircle2,
  Mail,
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  TestTube,
  XCircle,
} from "lucide-react";

interface AppSettings {
  id?: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  teamsWebhookUrl: string;
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
}

const defaultSettings: AppSettings = {
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  teamsWebhookUrl: "",
  azureTenantId: "",
  azureClientId: "",
  azureClientSecret: "",
};

type ActiveTab = "smtp" | "teams" | "azure";

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("smtp");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ...defaultSettings,
          ...data,
          smtpPort: String(data.smtpPort || "587"),
        });
      }
    } catch {
      // use defaults
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
      fetchSettings();
    }
  }, [authStatus, router, fetchSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          smtpPort: parseInt(settings.smtpPort) || 587,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccessMsg("Settings saved successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to save settings"
      );
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    setTesting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: settings.smtpHost,
          smtpPort: parseInt(settings.smtpPort) || 587,
          smtpUser: settings.smtpUser,
          smtpPass: settings.smtpPass,
          smtpFrom: settings.smtpFrom,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "SMTP test failed");
      }

      setSuccessMsg("SMTP test email sent successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "SMTP test failed"
      );
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setTesting(false);
    }
  }

  function updateSettings(field: keyof AppSettings, value: string) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function togglePasswordVisibility(field: string) {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  if (authStatus === "loading" || loading) {
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
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure email, notifications, and authentication settings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("smtp")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "smtp"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Mail className="h-4 w-4" />
          SMTP / Email
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "teams"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Teams
        </button>
        <button
          onClick={() => setActiveTab("azure")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "azure"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Shield className="h-4 w-4" />
          Azure AD
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* SMTP Settings */}
        {activeTab === "smtp" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Mail className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  SMTP Configuration
                </h2>
                <p className="text-sm text-gray-500">
                  Configure outgoing email server for notifications
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtpHost}
                  onChange={(e) => updateSettings("smtpHost", e.target.value)}
                  placeholder="smtp.office365.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => updateSettings("smtpPort", e.target.value)}
                  placeholder="587"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={settings.smtpUser}
                  onChange={(e) => updateSettings("smtpUser", e.target.value)}
                  placeholder="noreply@company.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SMTP Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.smtpPass ? "text" : "password"}
                    value={settings.smtpPass}
                    onChange={(e) =>
                      updateSettings("smtpPass", e.target.value)
                    }
                    placeholder="Enter password"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("smtpPass")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.smtpPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  From Email Address
                </label>
                <input
                  type="email"
                  value={settings.smtpFrom}
                  onChange={(e) => updateSettings("smtpFrom", e.target.value)}
                  placeholder="noreply@company.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestSmtp}
                disabled={testing || !settings.smtpHost}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <TestTube className="h-4 w-4 mr-1.5" />
                )}
                Send Test Email
              </Button>
            </div>
          </div>
        )}

        {/* Teams Settings */}
        {activeTab === "teams" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Microsoft Teams Integration
                </h2>
                <p className="text-sm text-gray-500">
                  Send notifications to a Teams channel via webhook
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Webhook URL
              </label>
              <input
                type="url"
                value={settings.teamsWebhookUrl}
                onChange={(e) =>
                  updateSettings("teamsWebhookUrl", e.target.value)
                }
                placeholder="https://company.webhook.office.com/webhookb2/..."
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Create an incoming webhook connector in your Teams channel and
                paste the URL here
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                How to set up a Teams webhook
              </h4>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>
                  Open the Teams channel where you want notifications
                </li>
                <li>
                  Click the channel name, then &quot;Connectors&quot;
                </li>
                <li>
                  Find &quot;Incoming Webhook&quot; and click
                  &quot;Configure&quot;
                </li>
                <li>Give it a name and copy the webhook URL</li>
                <li>Paste the URL in the field above</li>
              </ol>
            </div>
          </div>
        )}

        {/* Azure AD Settings */}
        {activeTab === "azure" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Azure Active Directory
                </h2>
                <p className="text-sm text-gray-500">
                  Configure SSO authentication via Azure AD
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tenant ID
                </label>
                <input
                  type="text"
                  value={settings.azureTenantId}
                  onChange={(e) =>
                    updateSettings("azureTenantId", e.target.value)
                  }
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Client ID (Application ID)
                </label>
                <input
                  type="text"
                  value={settings.azureClientId}
                  onChange={(e) =>
                    updateSettings("azureClientId", e.target.value)
                  }
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type={
                      showPasswords.azureClientSecret ? "text" : "password"
                    }
                    value={settings.azureClientSecret}
                    onChange={(e) =>
                      updateSettings("azureClientSecret", e.target.value)
                    }
                    placeholder="Enter client secret"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      togglePasswordVisibility("azureClientSecret")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.azureClientSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                Azure AD Setup Notes
              </h4>
              <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                <li>
                  Register an application in Azure AD portal
                </li>
                <li>
                  Set the redirect URI to your application callback URL
                </li>
                <li>
                  Grant &quot;User.Read&quot; and &quot;Directory.Read.All&quot;
                  API permissions
                </li>
                <li>
                  Create a client secret and copy it before it disappears
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
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
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
