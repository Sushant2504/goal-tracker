"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Mail,
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  TestTube,
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

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("smtp");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {}
  );

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

      toast.success("Settings saved successfully");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    setTesting(true);

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

      toast.success("SMTP test email sent successfully");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "SMTP test failed"
      );
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
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
        title="System Settings"
        subtitle="Configure email, notifications, and authentication settings"
      />

      <form onSubmit={handleSave}>
        <Tabs
          defaultValue="smtp"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as string)}
        >
          <TabsList>
            <TabsTrigger value="smtp">
              <Mail className="h-3.5 w-3.5 mr-1" />
              SMTP / Email
            </TabsTrigger>
            <TabsTrigger value="teams">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="azure">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Azure AD
            </TabsTrigger>
          </TabsList>

          {/* SMTP Settings */}
          <TabsContent value="smtp">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-gray-900">
                    SMTP Configuration
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Configure outgoing email server for notifications
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    SMTP Host
                  </label>
                  <Input
                    value={settings.smtpHost}
                    onChange={(e) =>
                      updateSettings("smtpHost", e.target.value)
                    }
                    placeholder="smtp.office365.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    SMTP Port
                  </label>
                  <Input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) =>
                      updateSettings("smtpPort", e.target.value)
                    }
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    SMTP Username
                  </label>
                  <Input
                    value={settings.smtpUser}
                    onChange={(e) =>
                      updateSettings("smtpUser", e.target.value)
                    }
                    placeholder="noreply@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    SMTP Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.smtpPass ? "text" : "password"}
                      value={settings.smtpPass}
                      onChange={(e) =>
                        updateSettings("smtpPass", e.target.value)
                      }
                      placeholder="Enter password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("smtpPass")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.smtpPass ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    From Email Address
                  </label>
                  <Input
                    type="email"
                    value={settings.smtpFrom}
                    onChange={(e) =>
                      updateSettings("smtpFrom", e.target.value)
                    }
                    placeholder="noreply@company.com"
                  />
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestSmtp}
                  disabled={testing || !settings.smtpHost}
                >
                  {testing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <TestTube className="h-3.5 w-3.5 mr-1" />
                  )}
                  Send Test Email
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Teams Settings */}
          <TabsContent value="teams">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-gray-900">
                    Microsoft Teams Integration
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Send notifications to a Teams channel via webhook
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Webhook URL
                </label>
                <Input
                  type="url"
                  value={settings.teamsWebhookUrl}
                  onChange={(e) =>
                    updateSettings("teamsWebhookUrl", e.target.value)
                  }
                  placeholder="https://company.webhook.office.com/webhookb2/..."
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Create an incoming webhook connector in your Teams channel
                  and paste the URL here
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                <h4 className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide mb-1">
                  How to set up a Teams webhook
                </h4>
                <ol className="text-[11px] text-blue-700 space-y-0.5 list-decimal list-inside">
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
          </TabsContent>

          {/* Azure AD Settings */}
          <TabsContent value="azure">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-gray-900">
                    Azure Active Directory
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Configure SSO authentication via Azure AD
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Tenant ID
                  </label>
                  <Input
                    value={settings.azureTenantId}
                    onChange={(e) =>
                      updateSettings("azureTenantId", e.target.value)
                    }
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Client ID (Application ID)
                  </label>
                  <Input
                    value={settings.azureClientId}
                    onChange={(e) =>
                      updateSettings("azureClientId", e.target.value)
                    }
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Client Secret
                  </label>
                  <div className="relative">
                    <Input
                      type={
                        showPasswords.azureClientSecret
                          ? "text"
                          : "password"
                      }
                      value={settings.azureClientSecret}
                      onChange={(e) =>
                        updateSettings(
                          "azureClientSecret",
                          e.target.value
                        )
                      }
                      placeholder="Enter client secret"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        togglePasswordVisibility("azureClientSecret")
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.azureClientSecret ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                <h4 className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
                  Azure AD Setup Notes
                </h4>
                <ul className="text-[11px] text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>
                    Register an application in Azure AD portal
                  </li>
                  <li>
                    Set the redirect URI to your application callback URL
                  </li>
                  <li>
                    Grant &quot;User.Read&quot; and
                    &quot;Directory.Read.All&quot; API permissions
                  </li>
                  <li>
                    Create a client secret and copy it before it
                    disappears
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-3">
          <Button type="submit" disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
