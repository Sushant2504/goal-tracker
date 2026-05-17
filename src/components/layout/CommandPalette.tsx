"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Columns3,
  Goal,
  ClipboardCheck,
  Users,
  CheckCircle,
  CalendarRange,
  BarChart3,
  LineChart,
  AlertTriangle,
  ScrollText,
  Settings,
  Search,
  Moon,
  Target,
  User,
} from "lucide-react";

type SearchResults = {
  employees: { id: string; name: string; email: string; role: string; department: string | null }[];
  goals: { id: string; title: string; thrustArea: string; goalSheetId: string }[];
  cycles: { id: string; name: string; status: string }[];
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { label: "Board", href: "/dashboard/board", icon: Columns3, shortcut: "B" },
  { label: "My Goals", href: "/dashboard/employee/goals", icon: Goal },
  { label: "Check-ins", href: "/dashboard/employee/checkins", icon: ClipboardCheck },
  { label: "Team", href: "/dashboard/manager/team", icon: Users },
  { label: "Approve Goals", href: "/dashboard/manager/approve", icon: CheckCircle },
  { label: "Employees", href: "/dashboard/admin/employees", icon: Users },
  { label: "Cycles", href: "/dashboard/admin/cycles", icon: CalendarRange },
  { label: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
  { label: "Analytics", href: "/dashboard/admin/analytics", icon: LineChart },
  { label: "Escalations", href: "/dashboard/admin/escalations", icon: AlertTriangle },
  { label: "Audit Log", href: "/dashboard/admin/audit-log", icon: ScrollText },
  { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    employees: [],
    goals: [],
    cycles: [],
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for custom event
  useEffect(() => {
    function handleCustomOpen() {
      setOpen(true);
    }
    window.addEventListener("open-command-palette", handleCustomOpen);
    return () => window.removeEventListener("open-command-palette", handleCustomOpen);
  }, []);

  // Search API with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.trim().length < 2) {
      setResults({ employees: [], goals: [], cycles: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data: SearchResults = await res.json();
          setResults(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const handleToggleTheme = useCallback(() => {
    setOpen(false);
    setQuery("");
    window.dispatchEvent(new Event("toggle-theme"));
  }, []);

  const hasSearchResults = useMemo(
    () =>
      results.employees.length > 0 ||
      results.goals.length > 0 ||
      results.cycles.length > 0,
    [results]
  );

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ employees: [], goals: [], cycles: [] });
    }
  }, [open]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed inset-0 z-50"
      filter={(value, search) => {
        // Let cmdk handle filtering for nav/action items
        // Search results are fetched from API so always show them
        if (value.startsWith("search-")) return 1;
        if (value.toLowerCase().includes(search.toLowerCase())) return 1;
        return 0;
      }}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Dialog container */}
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh] pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden dark:bg-gray-900 dark:border-gray-700">
          {/* Input */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-700">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search..."
              className="flex-1 h-11 bg-transparent text-[13px] text-gray-900 placeholder:text-gray-400 outline-none dark:text-gray-100"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400 dark:border-gray-600 dark:bg-gray-800">
              ESC
            </kbd>
          </div>

          {/* List */}
          <Command.List className="max-h-[400px] overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-[13px] text-gray-500">
              {loading ? "Searching..." : "No results found."}
            </Command.Empty>

            {/* Navigation */}
            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
            >
              {NAV_ITEMS.map((item) => (
                <Command.Item
                  key={item.href}
                  value={item.label}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-gray-700 cursor-pointer data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 dark:text-gray-300 dark:data-[selected=true]:bg-indigo-950 dark:data-[selected=true]:text-indigo-300"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="ml-auto h-5 inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400 dark:border-gray-600 dark:bg-gray-800">
                      {item.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Search Results */}
            {hasSearchResults && (
              <>
                <Command.Separator className="my-1.5 h-px bg-gray-200 dark:bg-gray-700" />

                {results.employees.length > 0 && (
                  <Command.Group
                    heading="Employees"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
                  >
                    {results.employees.map((emp) => (
                      <Command.Item
                        key={emp.id}
                        value={`search-employee-${emp.id}`}
                        onSelect={() => navigate(`/dashboard/admin/employees`)}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-gray-700 cursor-pointer data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 dark:text-gray-300 dark:data-[selected=true]:bg-indigo-950 dark:data-[selected=true]:text-indigo-300"
                      >
                        <User className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">{emp.name}</span>
                        <span className="text-[11px] text-gray-400 truncate">
                          {emp.department ?? emp.role}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {results.goals.length > 0 && (
                  <Command.Group
                    heading="Goals"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
                  >
                    {results.goals.map((goal) => (
                      <Command.Item
                        key={goal.id}
                        value={`search-goal-${goal.id}`}
                        onSelect={() => navigate(`/dashboard/employee/goals`)}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-gray-700 cursor-pointer data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 dark:text-gray-300 dark:data-[selected=true]:bg-indigo-950 dark:data-[selected=true]:text-indigo-300"
                      >
                        <Target className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">{goal.title}</span>
                        <span className="text-[11px] text-gray-400 truncate">
                          {goal.thrustArea}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {results.cycles.length > 0 && (
                  <Command.Group
                    heading="Cycles"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
                  >
                    {results.cycles.map((cycle) => (
                      <Command.Item
                        key={cycle.id}
                        value={`search-cycle-${cycle.id}`}
                        onSelect={() => navigate(`/dashboard/admin/cycles`)}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-gray-700 cursor-pointer data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 dark:text-gray-300 dark:data-[selected=true]:bg-indigo-950 dark:data-[selected=true]:text-indigo-300"
                      >
                        <CalendarRange className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">{cycle.name}</span>
                        <span className="text-[11px] text-gray-400">
                          {cycle.status}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}

            {/* Actions */}
            <Command.Separator className="my-1.5 h-px bg-gray-200 dark:bg-gray-700" />
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
            >
              <Command.Item
                value="Toggle Dark Mode"
                onSelect={handleToggleTheme}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-gray-700 cursor-pointer data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 dark:text-gray-300 dark:data-[selected=true]:bg-indigo-950 dark:data-[selected=true]:text-indigo-300"
              >
                <Moon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1">Toggle Dark Mode</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </div>
      </div>
    </Command.Dialog>
  );
}
