"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  Users,
  UserCheck,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Mail,
  FileX,
} from "lucide-react";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  manager?: { id: string; name: string } | null;
  goalSheets?: {
    id: string;
    status: string;
    cycleId: string;
    cycle?: { name: string };
  }[];
  _count?: { goalSheets: number };
}

export default function EmployeesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState<string[]>([]);
  const pageSize = 15;

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentFilter) params.set("department", departmentFilter);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : data.users || []);
        const depts = [
          ...new Set(
            (Array.isArray(data) ? data : data.users || [])
              .map((e: Employee) => e.department)
              .filter(Boolean)
          ),
        ] as string[];
        if (depts.length > 0) setDepartments(depts);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, roleFilter]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchEmployees();
    }
  }, [authStatus, router, fetchEmployees]);

  const filtered = employees.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getSheetStatus = (emp: Employee) => {
    if (!emp.goalSheets || emp.goalSheets.length === 0) return "No Sheet";
    return emp.goalSheets[0].status;
  };

  if (authStatus === "loading") {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees" },
        ]}
        title="Employees"
        subtitle="View and manage employees, departments, roles, and goal sheet status"
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Employees"
          value={employees.length}
          icon={Users}
          iconClassName="bg-indigo-100"
        />
        <StatCard
          title="Managers"
          value={employees.filter((e) => e.role === "MANAGER").length}
          icon={UserCheck}
          iconClassName="bg-emerald-100"
        />
        <StatCard
          title="Sheets Approved"
          value={
            employees.filter(
              (e) =>
                e.goalSheets &&
                e.goalSheets.some((gs) => gs.status === "APPROVED")
            ).length
          }
          icon={FileText}
          iconClassName="bg-blue-100"
        />
        <StatCard
          title="Departments"
          value={departments.length}
          icon={Building2}
          iconClassName="bg-amber-100"
        />
      </div>

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name, email, or department..."
      >
        <FilterSelect
          value={departmentFilter}
          onChange={(v) => {
            setDepartmentFilter(v);
            setPage(1);
          }}
          options={departments.map((d) => ({ value: d, label: d }))}
          placeholder="All Departments"
        />
        <FilterSelect
          value={roleFilter}
          onChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
          options={[
            { value: "ADMIN", label: "Admin" },
            { value: "MANAGER", label: "Manager" },
            { value: "EMPLOYEE", label: "Employee" },
          ]}
          placeholder="All Roles"
        />
      </FilterBar>

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileX}
          title="No employees found"
          description="Try adjusting your search or filter criteria."
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
                  Email
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                  Department
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                  Role
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                  Manager
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3">
                  Goal Sheet
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2 px-3 w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="py-2 px-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={emp.name || "?"} size="sm" />
                      <span className="text-[13px] font-medium text-gray-900">
                        {emp.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[13px] text-gray-600">
                    {emp.email}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[13px] text-gray-700">
                    {emp.department || "-"}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <StatusBadge status={emp.role} />
                  </TableCell>
                  <TableCell className="py-2 px-3 text-[13px] text-gray-700">
                    {emp.manager?.name || "-"}
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <StatusBadge status={getSheetStatus(emp)} />
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-xs" />
                        }
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/admin/employees/${emp.id}`
                            )
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(`mailto:${emp.email}`)
                          }
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Send Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-200">
              <div className="text-[11px] text-gray-500">
                Showing {(page - 1) * pageSize + 1}
                {" - "}
                {Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] text-gray-600 px-1">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
