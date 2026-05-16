"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  UserCheck,
  Building2,
  Filter,
} from "lucide-react";

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
        // Extract unique departments
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

  // Client-side search and pagination
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
    const latest = emp.goalSheets[0];
    return latest.status;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      APPROVED: "bg-green-50 text-green-700 border-green-200",
      SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
      DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
      RETURNED: "bg-red-50 text-red-700 border-red-200",
      "No Sheet": "bg-gray-100 text-gray-500 border-gray-200",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles["No Sheet"]}`}
      >
        {status}
      </span>
    );
  };

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
      MANAGER: "bg-indigo-50 text-indigo-700 border-indigo-200",
      EMPLOYEE: "bg-gray-50 text-gray-600 border-gray-200",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[role] || styles.EMPLOYEE}`}
      >
        {role}
      </span>
    );
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage employees, their departments, roles, and goal sheet
          status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {employees.length}
              </div>
              <div className="text-xs text-gray-500">Total Employees</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {employees.filter((e) => e.role === "MANAGER").length}
              </div>
              <div className="text-xs text-gray-500">Managers</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {
                  employees.filter(
                    (e) =>
                      e.goalSheets &&
                      e.goalSheets.some((gs) => gs.status === "APPROVED")
                  ).length
                }
              </div>
              <div className="text-xs text-gray-500">Sheets Approved</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Building2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {departments.length}
              </div>
              <div className="text-xs text-gray-500">Departments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none appearance-none"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
                    Department
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Manager
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Goal Sheet
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-gray-500"
                    >
                      No employees found
                    </td>
                  </tr>
                ) : (
                  paged.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {emp.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {emp.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {emp.department || "-"}
                      </td>
                      <td className="px-4 py-3">{roleBadge(emp.role)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {emp.manager?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(getSheetStatus(emp))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
