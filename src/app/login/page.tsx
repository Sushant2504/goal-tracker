"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Target, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Target className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">GoalTracker</span>
          </div>
          <p className="text-indigo-200 text-sm mt-1">Performance Goal Management</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Set goals.
              <br />
              Track progress.
              <br />
              Achieve results.
            </h1>
            <p className="text-indigo-200 text-lg max-w-md">
              Streamline your organization&apos;s goal-setting process with
              transparent tracking, real-time check-ins, and actionable insights.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold">95%</div>
              <div className="text-indigo-200 text-sm mt-1">Goal completion rate</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold">2x</div>
              <div className="text-indigo-200 text-sm mt-1">Faster reviews</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-indigo-200 text-sm mt-1">Visibility</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-indigo-300 text-sm">
          &copy; {new Date().getFullYear()} GoalTracker. All rights reserved.
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <Target className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">GoalTracker</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-gray-600">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 text-base font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-500">
            Contact your administrator if you need access.
          </div>
        </div>
      </div>
    </div>
  );
}
