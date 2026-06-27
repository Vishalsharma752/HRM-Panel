import { supabase } from "../components/supabase";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Download, Plus, Mail, Phone, MapPin,
  X, Star, Shield, Briefcase, Users, Grid3x3, List,
  Calendar, Award, FileText, Clock, TrendingUp, Lock, RefreshCw, AlertTriangle, Loader2,
} from "lucide-react";
import {
  PageHeader, Card, Button, Avatar, Badge, Input, Select, Tabs, Progress, EmptyState, ConfirmModal,
} from "../components/ui";
import { departments } from "../data/employees";
import { useStore, SyncedEmployee, ActivityRecord, validatePassword, useSupabaseEmployees } from "../data/store";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info" | "violet" | "indigo";
const statusMeta: Record<string, { variant: BadgeVariant; label: string; dot?: boolean }> = {
  Active: { variant: "success", label: "Active", dot: true },
  "On Leave": { variant: "warning", label: "On Leave", dot: true },
  Inactive: { variant: "danger", label: "Inactive", dot: true },
  Probation: { variant: "violet", label: "Probation", dot: true },
};

// Helper: generate deterministic avatar SVG
function makeAvatar(name: string): string {
  const safe = (name || "U").trim();
  const initials = safe.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text></svg>`
  )}`;
}

// Helper: extract numeric DB id from formatted EMP-XXX string
function extractDbId(empId: string): number | null {
  const parts = empId.split("-");
  const num = parseInt(parts[parts.length - 1] || "", 10);
  return isNaN(num) ? null : num;
}

export function Employees({ search, setSearch }: { search?: string; setSearch?: (s: string) => void }) {
  // Supabase: employees array, loading, error, and manual refetch
  const [, isLoading, fetchError, refetch] = useSupabaseEmployees();
  const [employees, setEmployees] = useStore<SyncedEmployee[]>("employees", []);
  const [, setActivities] = useStore<ActivityRecord[]>("activities", []);

  // Debug logs
  useEffect(() => {
    console.log("[Employees] employees in state:", employees.length, employees[0] || "none");
  }, [employees]);
  useEffect(() => {
    if (fetchError) console.error("[Employees] Supabase fetch error:", fetchError);
  }, [fetchError]);

  // View / search / filter state
  const [view, setView] = useState<"grid" | "list">("list");
  const [localSearch, setLocalSearch] = useState("");
  const searchVal = search !== undefined ? search : localSearch;
  const onSearchChange = useCallback(
    (v: string) => (setSearch !== undefined ? setSearch(v) : setLocalSearch(v)),
    [setSearch]
  );

  const [inputValue, setInputValue] = useState(searchVal);
  const [debouncedSearch, setDebouncedSearch] = useState(searchVal);

  useEffect(() => { setInputValue(searchVal); }, [searchVal]);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
      if (inputValue !== searchVal) onSearchChange(inputValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [inputValue, onSearchChange, searchVal]);

  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("All");
  const [tab, setTab] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SyncedEmployee | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const drawer = useMemo(
    () => employees.find((e) => e.id === drawerId) || null,
    [employees, drawerId]
  );

  // Normalize + filter employees — fully null-safe
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    const result = employees
      .map((e) => {
        const name = (e.name || (e as any).full_name || "Unknown").trim();
        const email = (e.email || (e as any).official_email || "").trim();
        const empCode = (e.empCode || (e as any).emp_code || "").trim();
        const phone = (e.phone || (e as any).mobile || "—").trim();
        const joinDate = e.joinDate || (e as any).doj || new Date().toISOString().split("T")[0];
        const designation = (e.designation || "Employee").trim();
        const department = (e.department || "General").trim();
        const statusVal = (e.status || "Active").trim() as "Active" | "On Leave" | "Inactive" | "Probation";
        const role = (e.role || "Employee") as "Admin" | "Employee";
        const avatar = e.avatar || makeAvatar(name);
        return { ...e, name, email, empCode, phone, joinDate, designation, department, status: statusVal, role, avatar };
      })
      .filter((e) => {
        if (q) {
          const match =
            e.name.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e.empCode.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (dept !== "All" && e.department !== dept) return false;
        if (status !== "All" && e.status !== status) return false;
        if (tab === "active" && e.status !== "Active") return false;
        if (tab === "leave" && e.status !== "On Leave") return false;
        if (tab === "probation" && e.status !== "Probation") return false;
        return true;
      });

    // Custom sort: Navdeep Sharma first, Kashif Nawaz second, then the rest
    result.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      const isANavdeep = aName.includes("navdeep") && aName.includes("sharma");
      const isBNavdeep = bName.includes("navdeep") && bName.includes("sharma");

      const isAKashif = aName.includes("kashif") && aName.includes("nawaz");
      const isBKashif = bName.includes("kashif") && bName.includes("nawaz");

      if (isANavdeep && isBNavdeep) return 0;
      if (isANavdeep) return -1;
      if (isBNavdeep) return 1;

      if (isAKashif && isBKashif) return 0;
      if (isAKashif) return -1;
      if (isBKashif) return 1;

      return 0;
    });

    console.log("[Employees] filtered:", result.length, "/ total:", employees.length);
    return result;
  }, [employees, debouncedSearch, dept, status, tab]);

  const allCount = employees.length;
  const activeCount = employees.filter((e) => (e.status || "Active") === "Active").length;
  const leaveCount = employees.filter((e) => (e.status || "") === "On Leave").length;
  const probationCount = employees.filter((e) => (e.status || "") === "Probation").length;

  // ── ADD EMPLOYEE ─────────────────────────────────────────────────────────
  const handleAddEmployee = useCallback(async (newEmp: Omit<SyncedEmployee, "id" | "empCode" | "avatar">) => {
    // Validate required fields
    if (!newEmp.name?.trim() || !newEmp.email?.trim() || !newEmp.designation?.trim() || !newEmp.department?.trim()) {
      showToast("Required: Name, Email, Designation, Department.", "error");
      return;
    }

    setIsMutating(true);
    const dbRow = {
      emp_code: null,                          // DB will auto-assign or generate
      full_name: newEmp.name.trim(),
      official_email: newEmp.email.trim(),
      mobile: newEmp.phone?.trim() || null,
      department: newEmp.department.trim(),
      designation: newEmp.designation.trim(),
      role: newEmp.role || "Employee",
      status: newEmp.status || "Active",
      doj: newEmp.joinDate || new Date().toISOString().split("T")[0],
      location: newEmp.location || "India",
      manager: newEmp.manager?.trim() || null,
      salary: newEmp.salary || null,
      password: newEmp.password || "Password123!",
    };

    console.log("[Employees] INSERT →", dbRow);
    try {
      const { data, error } = await supabase.from("employees").insert([dbRow]).select();

      if (error) {
        console.error("[Employees] INSERT error:", error);
        showToast(`Add failed: ${error.message}`, "error");
        setIsMutating(false);
        return;
      }

      console.log("[Employees] INSERT result:", data);
      showToast(`Employee "${newEmp.name}" added successfully.`, "success");

      // Refetch to get server-assigned ID and emp_code
      await refetch();
      setActivities((prev: ActivityRecord[]) => [{
        id: Date.now(), user: "System Admin",
        action: "added new employee", target: newEmp.name, time: "Just now", avatar: makeAvatar(newEmp.name),
      }, ...prev]);
    } catch (ex: any) {
      console.error("[Employees] INSERT exception:", ex);
      showToast(`Add failed: ${ex.message}`, "error");
    } finally {
      setIsMutating(false);
    }
  }, [refetch, setActivities, showToast]);

  // ── EDIT EMPLOYEE ─────────────────────────────────────────────────────────
  const handleEditEmployee = useCallback(async (updatedEmp: SyncedEmployee) => {
    if (!updatedEmp.name?.trim() || !updatedEmp.email?.trim() || !updatedEmp.designation?.trim() || !updatedEmp.department?.trim()) {
      showToast("Required: Name, Email, Designation, Department.", "error");
      return;
    }

    const dbId = extractDbId(updatedEmp.id);
    if (dbId === null) {
      showToast("Invalid employee ID — cannot sync to database.", "error");
      return;
    }

    setIsMutating(true);
    const dbRow = {
      emp_code: updatedEmp.empCode || null,
      full_name: updatedEmp.name.trim(),
      official_email: updatedEmp.email.trim(),
      mobile: updatedEmp.phone?.trim() || null,
      department: updatedEmp.department.trim(),
      designation: updatedEmp.designation.trim(),
      role: updatedEmp.role || "Employee",
      status: updatedEmp.status || "Active",
      doj: updatedEmp.joinDate || null,
      location: updatedEmp.location || null,
      manager: updatedEmp.manager?.trim() || null,
      salary: updatedEmp.salary || null,
      password: updatedEmp.password || "Password123!",
    };

    console.log("[Employees] UPDATE id=" + dbId + " →", dbRow);
    try {
      const { error } = await supabase.from("employees").update(dbRow).eq("id", dbId);

      if (error) {
        console.error("[Employees] UPDATE error:", error);
        showToast(`Update failed: ${error.message}`, "error");
        setIsMutating(false);
        return;
      }

      console.log("[Employees] UPDATE success");
      showToast(`Employee "${updatedEmp.name}" updated successfully.`, "success");

      await refetch();
      setActivities((prev: ActivityRecord[]) => [{
        id: Date.now(), user: "System Admin",
        action: "updated details of", target: updatedEmp.name, time: "Just now", avatar: updatedEmp.avatar,
      }, ...prev]);
    } catch (ex: any) {
      console.error("[Employees] UPDATE exception:", ex);
      showToast(`Update failed: ${ex.message}`, "error");
    } finally {
      setIsMutating(false);
    }
  }, [refetch, setActivities, showToast]);

  // ── TOGGLE STATUS ─────────────────────────────────────────────────────────
  const handleToggleStatus = useCallback(async (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const nextStatus = emp.status === "Active" ? "Inactive" : "Active";
    const dbId = extractDbId(empId);
    if (dbId === null) {
      showToast("Invalid employee ID.", "error");
      return;
    }

    setIsMutating(true);
    console.log(`[Employees] TOGGLE STATUS id=${dbId} → ${nextStatus}`);
    try {
      const { error } = await supabase.from("employees").update({ status: nextStatus }).eq("id", dbId);

      if (error) {
        console.error("[Employees] STATUS UPDATE error:", error);
        showToast(`Status update failed: ${error.message}`, "error");
        setIsMutating(false);
        return;
      }

      showToast(`${nextStatus === "Active" ? "Activated" : "Deactivated"} "${emp.name}".`, "success");
      // Optimistic update + refetch
      setEmployees((prev: SyncedEmployee[]) => prev.map((e) => e.id === empId ? { ...e, status: nextStatus } : e));
      setActivities((prev: ActivityRecord[]) => [{
        id: Date.now(), user: "System Admin",
        action: nextStatus === "Active" ? "activated" : "deactivated",
        target: emp.name, time: "Just now", avatar: emp.avatar,
      }, ...prev]);
      await refetch();
    } catch (ex: any) {
      console.error("[Employees] STATUS UPDATE exception:", ex);
      showToast(`Status update failed: ${ex.message}`, "error");
    } finally {
      setIsMutating(false);
    }
  }, [employees, refetch, setActivities, setEmployees, showToast]);

  // ── DELETE EMPLOYEE ───────────────────────────────────────────────────────
  const handleDeleteEmployee = useCallback(async (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    if (emp.role === "Admin" || emp.email === "admin@tisnx.com") {
      showToast("System Administrator account cannot be deleted.", "error");
      setDeletingId(null);
      return;
    }

    const dbId = extractDbId(empId);
    if (dbId === null) {
      showToast("Invalid employee ID — cannot delete from database.", "error");
      setDeletingId(null);
      return;
    }

    setIsMutating(true);
    console.log(`[Employees] DELETE id=${dbId} (${emp.name})`);
    try {
      const { error } = await supabase.from("employees").delete().eq("id", dbId);

      if (error) {
        console.error("[Employees] DELETE error:", error);
        showToast(`Delete failed: ${error.message}`, "error");
        setIsMutating(false);
        setDeletingId(null);
        return;
      }

      console.log("[Employees] DELETE success");
      showToast(`Employee "${emp.name}" deleted successfully.`, "success");

      // Optimistic remove from UI
      setEmployees((prev: SyncedEmployee[]) => prev.filter((e) => e.id !== empId));
      setActivities((prev: ActivityRecord[]) => [{
        id: Date.now(), user: "System Admin",
        action: "removed employee", target: emp.name, time: "Just now", avatar: emp.avatar,
      }, ...prev]);
      if (drawerId === empId) setDrawerId(null);
    } catch (ex: any) {
      console.error("[Employees] DELETE exception:", ex);
      showToast(`Delete failed: ${ex.message}`, "error");
    } finally {
      setIsMutating(false);
      setDeletingId(null);
    }
  }, [drawerId, employees, setActivities, setEmployees, showToast]);

  // ─────────────────────────────── RENDER ──────────────────────────────────

  // Full-page loading state (first load)
  if (isLoading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Loading employees from database…</p>
        </div>
      </div>
    );
  }

  // Full-page error state (no cached data)
  if (fetchError && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Failed to load employees</p>
          <p className="text-xs text-slate-500">{fetchError}</p>
          <Button variant="primary" size="md" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const supabaseErrorBanner = fetchError ? (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-700 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4" /> Supabase sync failed: {fetchError}. Showing cached data.
      <button onClick={() => refetch()} className="ml-auto underline">Retry</button>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle={`Manage your entire workforce — ${allCount} people across ${departments.length} departments`}
        breadcrumb={[{ label: "Home" }, { label: "People" }, { label: "Employees" }]}
        actions={
          <>
            <Button variant="secondary" size="md" leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} onClick={() => refetch()} disabled={isLoading}>Refresh</Button>
            <Button variant="secondary" size="md" leftIcon={<Download className="h-4 w-4" />}>Export</Button>
            <Button variant="gradient" size="md" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingEmployee(null); setShowModal(true); }} disabled={isMutating}>Add Employee</Button>
          </>
        }
      />

      {/* ✅ Supabase error banner */}
      {supabaseErrorBanner}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Headcount", value: allCount.toString(), color: "from-indigo-500 to-violet-600", icon: <Users className="h-4 w-4" />, delta: "Synced active users" },
          { label: "On Probation", value: probationCount.toString(), color: "from-amber-500 to-orange-600", icon: <Clock className="h-4 w-4" />, delta: "Awaiting regular status" },
          { label: "On Leave Today", value: leaveCount.toString(), color: "from-emerald-500 to-teal-600", icon: <TrendingUp className="h-4 w-4" />, delta: "Active leave requests" },
          { label: "Active Directory", value: activeCount.toString(), color: "from-rose-500 to-pink-600", icon: <Award className="h-4 w-4" />, delta: "Ready to assign tasks" },
        ].map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{k.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md ${k.color}`}>{k.icon}</div>
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold text-slate-900">{k.value}</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 sm:max-w-xs">
              <Input placeholder="Search by name, email, ID…" leftIcon={<Search className="h-4 w-4" />} value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            </div>
            <Select value={dept} onChange={(e) => setDept(e.target.value)} className="sm:w-44">
              <option>All</option>
              {departments.map(d => <option key={d.name}>{d.name}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-36">
              <option>All</option>
              <option>Active</option>
              <option>On Leave</option>
              <option>Probation</option>
              <option>Inactive</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onChange={(v) => setView(v as any)} items={[
              { value: "list", label: <><List className="h-3.5 w-3.5" /> List</> },
              { value: "grid", label: <><Grid3x3 className="h-3.5 w-3.5" /> Grid</> },
            ]} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tabs value={tab} onChange={setTab} items={[
            { value: "all", label: "All Employees", count: allCount },
            { value: "active", label: "Active", count: activeCount },
            { value: "leave", label: "On Leave", count: leaveCount },
            { value: "probation", label: "Probation", count: probationCount },
          ]} />
          <span className="ml-auto text-xs text-slate-500">
            Showing <span className="font-bold text-slate-900">{filtered.length}</span> of <span className="font-bold text-slate-900">{allCount}</span> employees
          </span>
        </div>
      </Card>

      {/* Inline refresh loading bar */}
      {isLoading && employees.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing with database…
        </div>
      )}

      {/* Mutation loading overlay for in-progress ops */}
      {isMutating && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving changes to database…
        </div>
      )}

      {/* View */}
      {filtered.length === 0 ? (
        <Card className="p-16 flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
              <p className="text-sm text-slate-500">Loading employees…</p>
            </div>
          ) : (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={debouncedSearch || dept !== "All" || status !== "All" || tab !== "all" ? "No employees match your filters" : "No employees in database"}
              description={debouncedSearch || dept !== "All" || status !== "All" || tab !== "all" ? "Try adjusting your search or filters to see more results." : "Add your first employee using the button above."}
            />
          )}
        </Card>
      ) : view === "list" ? (
        <Card>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Location</th>
                  <th className="px-4 py-3 hidden xl:table-cell">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(e => {
                  const sm = statusMeta[e.status] || { variant: "neutral", label: e.status };
                  return (
                    <tr key={e.id} className="group cursor-pointer transition-all duration-200 hover:bg-gray-50" onClick={() => setDrawerId(e.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={e.avatar} name={e.name} size={36} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-sm font-semibold text-slate-900 max-w-[120px]">{e.name}</span>
                              {e.role === "Admin" && <Shield className="h-3 w-3 shrink-0 text-amber-500" />}
                            </div>
                            <div className="truncate text-[11px] text-slate-400 max-w-[130px]">{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="indigo">{e.department}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[140px] truncate text-sm text-slate-700" title={e.designation}>{e.designation}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                        <div className="inline-flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate max-w-[100px]">{e.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden xl:table-cell whitespace-nowrap">
                        {new Date(e.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={sm.variant} dot={sm.dot}>{sm.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => { setEditingEmployee(e); setShowModal(true); }}>Edit</Button>
                          <Button
                            variant="secondary" size="sm"
                            className={e.status === "Active" ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}
                            onClick={() => handleToggleStatus(e.id)}
                            title={e.status === "Active" ? "Deactivate" : "Activate"}
                          >
                            {e.status === "Active" ? "Off" : "On"}
                          </Button>
                          <Button
                            variant="secondary" size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeletingId(e.id)}
                            title="Delete"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(e => {
            const sm = statusMeta[e.status] || { variant: "neutral", label: e.status };
            return (
              <div key={e.id} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10">
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setDrawerId(e.id)}>
                  <Avatar src={e.avatar} name={e.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-sm font-bold text-slate-900">{e.name}</span>
                      {e.role === "Admin" && <Shield className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <div className="truncate text-xs text-slate-500">{e.designation}</div>
                  </div>
                  <Badge variant={sm.variant} dot={sm.dot}>{sm.label}</Badge>
                </div>
                <div className="mt-4 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <span className="truncate">{e.email}</span></div>
                  <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {e.phone}</div>
                  <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {e.location}</div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <Badge variant="indigo">{e.department}</Badge>
                  <div className="flex gap-2">
                    <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700" onClick={() => { setEditingEmployee(e); setShowModal(true); }}>Edit</button>
                    <button className={`text-xs font-semibold ${e.status === "Active" ? "text-rose-600" : "text-emerald-600"}`} onClick={() => handleToggleStatus(e.id)}>
                      {e.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button className="text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={() => setDeletingId(e.id)}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Employee Drawer */}
      {drawerId && (
        <EmployeeDrawer
          employee={drawer}
          onClose={() => setDrawerId(null)}
          onToggleStatus={handleToggleStatus}
          onEdit={(e) => { setEditingEmployee(e); setShowModal(true); }}
        />
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
          onSave={(emp) => {
            if (editingEmployee) handleEditEmployee(emp);
            else handleAddEmployee(emp);
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        title="Delete Employee"
        message="Are you sure you want to permanently remove this employee from the directory? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => { if (deletingId) handleDeleteEmployee(deletingId); }}
        onCancel={() => setDeletingId(null)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-top-5 duration-300">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-white ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}>
            {toast.type === "success" ? "✓" : "⚠️"}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">{toast.type === "success" ? "Success" : "Error"}</div>
            <div className="text-[11px] text-slate-500 font-medium">{toast.message}</div>
          </div>
          <button onClick={() => setToast(null)} className="ml-4 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------- Drawer --------------- */
function EmployeeDrawer({ employee, onClose, onToggleStatus, onEdit }: {
  employee: SyncedEmployee | null | undefined;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onEdit: (e: SyncedEmployee) => void;
}) {
  const [tab, setTab] = useState("profile");
  if (!employee) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-2xl p-8 items-center justify-center">
          <div className="text-center text-slate-500 font-semibold">No employee selected</div>
          <Button variant="primary" className="mt-4" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }
  const safeEmp = {
    ...employee,
    name: employee.name || (employee as any).full_name || "Unknown",
    email: employee.email || (employee as any).official_email || "",
    empCode: employee.empCode || (employee as any).emp_code || "",
    phone: employee.phone || (employee as any).mobile || "—",
    location: employee.location || "India",
    manager: employee.manager || (employee as any).manager || "—",
    joinDate: employee.joinDate || (employee as any).doj || new Date().toISOString().split("T")[0],
    department: employee.department || "General",
    designation: employee.designation || "Employee",
    role: employee.role || "Employee",
    status: employee.status || "Active",
    avatar: employee.avatar || ""
  };
  const sm = statusMeta[safeEmp.status] || { variant: "neutral" as const, label: safeEmp.status };
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-2xl">
        <div className="relative h-32 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
          <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="-mt-14 flex flex-col items-center px-6">
          <Avatar src={safeEmp.avatar} name={safeEmp.name} size={88} className="ring-4 ring-white shadow-xl" />
          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="font-display text-xl font-extrabold text-slate-900">{safeEmp.name}</h2>
              {safeEmp.role === "Admin" && <Shield className="h-4 w-4 text-amber-500" />}
            </div>
            <p className="text-sm text-slate-500">{safeEmp.designation} · {safeEmp.department}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Badge variant={sm.variant} dot={sm.dot}>{sm.label}</Badge>
              <Badge variant="indigo">⭐ Top performer</Badge>
            </div>
          </div>
        </div>

        <div className="px-6 pt-5">
          <div className="inline-flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {["profile", "attendance", "leave", "documents", "performance"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${tab === t ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {tab === "profile" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Employee ID" value={safeEmp.empCode} />
                <Field label="Email" value={safeEmp.email} />
                <Field label="Phone" value={safeEmp.phone} />
                <Field label="Location" value={safeEmp.location} />
                <Field label="Manager" value={safeEmp.manager || "—"} />
                <Field label="Joined" value={new Date(safeEmp.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                <Field label="Department" value={safeEmp.department} />
                <Field label="Role" value={safeEmp.role} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Performance</div>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Productivity" value="92%" tone="indigo" />
                  <Metric label="Attendance" value="98%" tone="emerald" />
                  <Metric label="Tasks Done" value="47/50" tone="amber" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {["React", "TypeScript", "Node.js", "AWS", "System Design", "Leadership", "Agile"].map(s => (
                    <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === "attendance" && (
            <div className="space-y-3">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
                const statuses = ["Present", "Present", "Present", "Late", "Present", "Off", "Off"];
                const tone = statuses[i] === "Present" ? "success" : statuses[i] === "Late" ? "warning" : "neutral";
                return (
                  <div key={d} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">{d}</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">9:0{i + 2} AM — 6:30 PM</div>
                        <div className="text-[11px] text-slate-500">8h 30m · 30m break</div>
                      </div>
                    </div>
                    <Badge variant={tone as any} dot>{statuses[i]}</Badge>
                  </div>
                );
              })}
            </div>
          )}
          {tab === "leave" && (
            <div className="space-y-3">
              {[
                { type: "Casual Leave", date: "12 — 13 Dec 2024", days: 2, status: "Approved" },
                { type: "Sick Leave", date: "03 Nov 2024", days: 1, status: "Approved" },
                { type: "Earned Leave", date: "20 — 24 Jan 2025", days: 5, status: "Pending" },
              ].map((l, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">{l.type}</div>
                    <Badge variant={l.status === "Approved" ? "success" : "warning"}>{l.status}</Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{l.date} · {l.days} day{l.days > 1 ? "s" : ""}</div>
                </div>
              ))}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">Leave Balance</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Metric label="Casual" value="8 days" tone="indigo" />
                  <Metric label="Sick" value="6 days" tone="rose" />
                  <Metric label="Earned" value="12 days" tone="emerald" />
                  <Metric label="WFH" value="10 days" tone="amber" />
                </div>
              </div>
            </div>
          )}
          {tab === "documents" && (
            <div className="space-y-2.5">
              {[
                { name: "Offer Letter.pdf", size: "245 KB", date: "12 Mar 2022" },
                { name: "ID Proof — Aadhaar.pdf", size: "1.2 MB", date: "12 Mar 2022" },
                { name: "NDA Agreement.pdf", size: "84 KB", date: "12 Mar 2022" },
                { name: "Appraisal Letter Q4.pdf", size: "120 KB", date: "28 Dec 2024" },
                { name: "Tax Declaration FY25.pdf", size: "98 KB", date: "05 Jan 2025" },
              ].map(d => (
                <div key={d.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{d.name}</div>
                    <div className="text-[11px] text-slate-500">{d.size} · {d.date}</div>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              ))}
            </div>
          )}
          {tab === "performance" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">Q4 2024 Review</div>
                <div className="mt-1 flex items-end gap-2">
                  <div className="font-display text-4xl font-extrabold text-slate-900">4.6</div>
                  <div className="mb-1 flex">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`h-4 w-4 ${i <= 4 ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">"Consistently exceeds expectations. Strong technical leadership and team collaboration."</p>
              </div>
              {[
                { goal: "Lead migration to React 19", status: "In Progress", value: 75 },
                { goal: "Mentor 2 junior engineers", status: "Completed", value: 100 },
                { goal: "Reduce API latency by 30%", status: "In Progress", value: 60 },
              ].map((g, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{g.goal}</div>
                    <Badge variant={g.status === "Completed" ? "success" : "indigo"}>{g.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={g.value} tone={g.status === "Completed" ? "emerald" : "indigo"} />
                    <span className="text-[10px] font-bold text-slate-600">{g.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          <Button
            variant="secondary" size="sm"
            className={safeEmp.status === "Active" ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}
            onClick={() => onToggleStatus(safeEmp.id)}
          >
            {safeEmp.status === "Active" ? "Deactivate" : "Activate"}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(safeEmp)}>Edit Profile</Button>
            <Button variant="primary" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "indigo" | "emerald" | "amber" | "rose" }) {
  const m = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className={`rounded-xl p-2.5 ${m[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-display text-lg font-extrabold">{value}</div>
    </div>
  );
}

/* --------------- Modal --------------- */
function EmployeeModal({ employee, onClose, onSave }: {
  employee?: SyncedEmployee | null;
  onClose: () => void;
  onSave: (emp: any) => void;
}) {
  const [name, setName] = useState(employee?.name || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [phone, setPhone] = useState(employee?.phone || "");
  const [department, setDepartment] = useState(employee?.department || departments[0]?.name || "Engineering");
  const [designation, setDesignation] = useState(employee?.designation || "");
  const [role, setRole] = useState<"Admin" | "Employee">(
    employee?.role === "Founder" || employee?.role === "Cofounder" || employee?.role === "Admin"
      ? "Admin"
      : "Employee"
  );
  const [status, setStatus] = useState<"Active" | "On Leave" | "Inactive" | "Probation">(employee?.status || "Active");
  const [location, setLocation] = useState(employee?.location || "Bengaluru, IN");
  const [joinDate, setJoinDate] = useState(employee?.joinDate || new Date().toISOString().split("T")[0]);
  const [manager, setManager] = useState(employee?.manager || "");
  const [salary, setSalary] = useState(employee?.salary?.toString() || "");
  const [pwd, setPwd] = useState(employee?.password || "Password123!");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !designation) {
      setError("Name, Email, and Designation are required.");
      return;
    }
    if (!employee || pwd !== employee.password) {
      const validationErr = validatePassword(pwd);
      if (validationErr) { setError(validationErr); return; }
    }
    const data: any = { name, email, phone, department, designation, role, status, location, joinDate, manager: manager || undefined, salary: salary ? parseInt(salary) : undefined, password: pwd };
    if (employee) onSave({ ...employee, ...data });
    else onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-900">
              {employee ? "Edit Employee Profile" : "Add New Employee"}
            </h2>
            <p className="text-xs text-slate-500">Configure corporate identity and role access</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <div className="mx-6 mt-4 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">
            ⚠️ {error}
          </div>
        )}
        <div className="max-h-[calc(90vh-140px)] space-y-4 overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Full Name" placeholder="Aarav Gupta" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <Input label="Email" type="email" placeholder="aarav.gupta@tisnx.com" leftIcon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Phone" placeholder="+91 98765 43210" leftIcon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {departments.map(d => <option key={d.name}>{d.name}</option>)}
            </Select>
            <Input label="Designation" placeholder="Senior Software Engineer" leftIcon={<Briefcase className="h-4 w-4" />} value={designation} onChange={(e) => setDesignation(e.target.value)} required />
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="Employee">Employee</option>
              <option value="Admin">Admin</option>
            </Select>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Probation">Probation</option>
              <option value="Inactive">Inactive</option>
            </Select>
            <Select label="Location" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option>Bengaluru, IN</option>
              <option>Mumbai, IN</option>
              <option>Noida, IN</option>
              <option>Remote</option>
            </Select>
            <Input label="Date of Joining" type="date" leftIcon={<Calendar className="h-4 w-4" />} value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
            <Input label="Manager Name" placeholder="Vikram Iyer" leftIcon={<Users className="h-4 w-4" />} value={manager} onChange={(e) => setManager(e.target.value)} />
            <Input label="Annual Salary (INR)" type="number" placeholder="1850000" leftIcon={<FileText className="h-4 w-4" />} value={salary} onChange={(e) => setSalary(e.target.value)} />
            <Input label="Account Password" type="text" placeholder="Enter secure password" leftIcon={<Lock className="h-4 w-4" />} value={pwd} onChange={(e) => setPwd(e.target.value)} required />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gradient" size="md">
            {employee ? "Save Changes" : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}