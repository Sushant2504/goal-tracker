"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { FilterBar, FilterSelect } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import { HoverPreviewCard } from "@/components/shared/HoverCard";
import {
  Users,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  BarChart3,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

interface GoalSheet {
  id: string;
  employeeId: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  cycle: { id: string; name: string; status: string };
  goals: { id: string; title: string; weightage: number }[];
  employee: TeamMember;
  approvedBy: { id: string; name: string } | null;
}

interface GoalCycle {
  id: string;
  name: string;
  status: string;
}

export default function ManagerTeamPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState<GoalCycle | null>(null);
  const [teamSheets, setTeamSheets] = useState<GoalSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const cycleRes = await fetch("/api/admin/cycles");
      if (!cycleRes.ok) throw new Error("Failed to load cycles");
      const cycles: GoalCycle[] = await cycleRes.json();
      const active = cycles.find((c) => c.status === "ACTIVE");
      if (!active) {
        setLoading(false);
        return;
      }
      setActiveCycle(active);

      const sheetsRes = await fetch(
        `/api/goal-sheets?cycleId=${active.id}&team=true`
      );
      if (!sheetsRes.ok) throw new Error("Failed to load team sheets");
      const sheets: GoalSheet[] = await sheetsRes.json();
      setTeamSheets(sheets);
    } catch (err) {
      console.error("Load error:", err);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    teamSheets.forEach((s) => {
      if (s.employee.department) depts.add(s.employee.department);
    });
    return Array.from(depts)
      .sort()
      .map((d) => ({ value: d, label: d }));
  }, [teamSheets]);

  const filteredSheets = useMemo(() => {
    return teamSheets.filter((s) => {
      if (departmentFilter && s.employee.department !== departmentFilter)
        return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.employee.name.toLowerCase().includes(q) ||
        s.employee.email.toLowerCase().includes(q) ||
        (s.employee.department || "").toLowerCase().includes(q)
      );
    });
  }, [teamSheets, searchQuery, departmentFilter]);

  // Create flattened data for sorting
  const flatSheets = useMemo(() => {
    return filteredSheets.map((s) => ({
      ...s,
      _name: s.employee.name,
      _department: s.employee.department || "",
      _status: s.status,
      _goals: s.goals.length,
    }));
  }, [filteredSheets]);

  const { sortedData: sortedSheets, sortConfig, requestSort } = useSortable(flatSheets);

  const totalMembers = new Set(teamSheets.map((s) => s.employeeId)).size;
  const submittedCount = teamSheets.filter(
    (s) => s.status === "SUBMITTED"
  ).length;
  const approvedCount = teamSheets.filter(
    (s) => s.status === "APPROVED"
  ).length;
  const draftCount = teamSheets.filter((s) => s.status === "DRAFT").length;
  const returnedCount = teamSheets.filter(
    (s) => s.status === "RETURNED"
  ).length;

  if (loading) {
    return <PageSkeleton />;
  }

  if (!activeCycle) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "My Team" },
          ]}
          title="My Team"
        />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center max-w-md">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              No Active Goal Cycle
            </h3>
            <p className="text-[13px] text-gray-600">
              There is no active goal cycle at the moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Team" },
        ]}
        title="My Team"
        subtitle={`${activeCycle.name} · ${totalMembers} direct report${totalMembers !== 1 ? "s" : ""}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Members"
          value={totalMembers}
          icon={Users}
          iconClassName="bg-blue-100"
        />
        <StatCard
          title="Pending Approval"
          value={submittedCount}
          icon={Send}
          iconClassName="bg-amber-100"
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          icon={CheckCircle2}
          iconClassName="bg-emerald-100"
        />
        <StatCard
          title="In Progress"
          value={draftCount + returnedCount}
          subtitle={
            returnedCount > 0 ? `${returnedCount} returned` : undefined
          }
          icon={Clock}
          iconClassName="bg-gray-100"
        />
      </div>

      {/* Progress bar */}
      {totalMembers > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-medium text-gray-700">
              Team Goal Completion
            </span>
            <span className="text-[11px] text-gray-500">
              {approvedCount} of {totalMembers} approved
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${totalMembers > 0 ? (approvedCount / totalMembers) * 100 : 0}%`,
              }}
            />
            <div
              className="h-full bg-amber-400 transition-all"
              style={{
                width: `${totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0}%`,
              }}
            />
            <div
              className="h-full bg-red-400 transition-all"
              style={{
                width: `${totalMembers > 0 ? (returnedCount / totalMembers) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Approved
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Submitted
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              Returned
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
              Draft
            </span>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email, or department..."
      >
        {departments.length > 0 && (
          <FilterSelect
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={departments}
            placeholder="All Departments"
          />
        )}
      </FilterBar>

      {/* Team members table */}
      {sortedSheets.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            searchQuery || departmentFilter
              ? "No matching team members"
              : "No goal sheets found"
          }
          description={
            searchQuery || departmentFilter
              ? "Try adjusting your search or filter."
              : "Your team members haven't created goal sheets for this cycle yet."
          }
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Team Member" sortKey="_name" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Department" sortKey="_department" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3">
                  <SortableHeader label="Sheet Status" sortKey="_status" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="py-2 px-3 text-center">
                  <SortableHeader label="Goals" sortKey="_goals" currentSort={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 py-2 px-3 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSheets.map((sheet) => (
                <TableRow key={sheet.id} className="hover:bg-gray-50/50">
                  <TableCell className="py-2 px-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={sheet.employee.name}
                        size="sm"
                        showTooltip
                        department={sheet.employee.department || undefined}
                      />
                      <div className="min-w-0">
                        <HoverPreviewCard
                          title={sheet.employee.name}
                          subtitle={sheet.employee.department || undefined}
                          stats={[
                            { label: "Goals", value: sheet.goals.length },
                            { label: "Status", value: sheet.status },
                          ]}
                        >
                          <p className="text-[13px] font-medium text-gray-900 truncate">
                            {sheet.employee.name}
                          </p>
                        </HoverPreviewCard>
                        <p className="text-[11px] text-gray-500 truncate">
                          {sheet.employee.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <span className="text-[13px] text-gray-600">
                      {sheet.employee.department || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <StatusBadge status={sheet.status} />
                  </TableCell>
                  <TableCell className="py-2 px-3 text-center">
                    <span className="text-[13px] text-gray-700">
                      {sheet.goals.length}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-xs" />
                        }
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={4}>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/manager/approve?sheetId=${sheet.id}`
                            )
                          }
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Review Goals
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/manager/checkins?sheetId=${sheet.id}`
                            )
                          }
                        >
                          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                          View Check-ins
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
