import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../components/supabase";
import { createClient } from "@supabase/supabase-js";
import {
  ShieldAlert, Plus, Mail, User, Lock, Edit2, Trash2, Search,
  Loader2, AlertTriangle, Check, ChevronLeft, ChevronRight,
  CalendarDays, Clock, Users, Crown, Shield, UserCheck,
  Activity, X, BookOpen, ArrowUpDown
} from "lucide-react";
import {
  PageHeader, Card, Button, Avatar, Badge, Input, Select, EmptyState, ConfirmModal
} from "../components/ui";
import { SyncedEmployee, Role } from "../data/store";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: string;
  dob?: string;
  doj?: string;
  department?: string;
  designation?: string;
  created_at?: string;
}

interface AuditEntry {
  id: string;
  actor: string;
  action: "created" | "updated" | "deleted";
  target: string;
  detail: string;
  timestamp: string;
}

type SortField = "name" | "role" | "created_at";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 8;

const ROLE_META: Record<string, { color: "indigo" | "violet" | "neutral" | "success"; icon: React.ElementType; label: string }> = {
  Founder:   { color: "indigo",   icon: Crown,    label: "Founder" },
  Cofounder: { color: "violet",   icon: Shield,   label: "Co-founder" },
  Admin:     { color: "success",  icon: UserCheck, label: "Admin" },
  Employee:  { color: "neutral",  icon: User,     label: "Employee" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminUsers({ currentUser }: { currentUser: SyncedEmployee | null }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Employee" as Role,
    dob: "",
    department: "",
    designation: "",
  });

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Loading / error states
  const [mutating, setMutating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Access Control
  const hasAccess = currentUser?.role === "Founder" || currentUser?.role === "Cofounder";

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushAudit = useCallback((
    action: AuditEntry["action"],
    target: string,
    detail: string
  ) => {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      actor: currentUser?.name ?? "Unknown",
      action,
      target,
      detail,
      timestamp: new Date().toISOString(),
    };
    setAuditLog((prev) => [entry, ...prev].slice(0, 50));
  }, [currentUser?.name]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("employees")
        .select("id, full_name, official_email, role, status, dob, doj, department, created_at")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;

      if (data) {
        const mapped = data.map((row: any): AdminUser => ({
          id: row.id,
          name: row.full_name || row.name || "Unknown",
          email: row.official_email || row.email || "",
          role: (row.role || "Employee") as Role,
          status: row.status || "Active",
          dob: row.dob || undefined,
          doj: row.doj || undefined,
          department: row.department || "General",
          designation: row.designation || "Employee",
          created_at: row.created_at || undefined,
        }));
        setUsers(mapped);
      }
    } catch (err: any) {
      console.error("[AdminUsers] fetch users error:", err.message);
      setError(err.message || "Failed to load users from employees table.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) {
      fetchUsers();
    }
  }, [hasAccess, fetchUsers]);

  // ── Filter / Sort / Paginate ───────────────────────────────────────────────

  const filteredSorted = useMemo(() => {
    let list = [...users];

    // Search filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.department || "").toLowerCase().includes(q) ||
          (u.designation || "").toLowerCase().includes(q)
      );
    }

    // Role filter
    if (roleFilter !== "All") {
      list = list.filter((u) => u.role.toLowerCase() === roleFilter.toLowerCase());
    }

    // Sort
    list.sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortField === "name") { av = a.name; bv = b.name; }
      else if (sortField === "role") { av = a.role; bv = b.role; }
      else { av = a.created_at || ""; bv = b.created_at || ""; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  }, [users, searchQuery, roleFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const paginated = filteredSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, roleFilter, sortField, sortDir]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: users.length,
    founders: users.filter((u) => u.role === "Founder").length,
    cofounders: users.filter((u) => u.role === "Cofounder").length,
    employees: users.filter((u) => u.role === "Employee").length,
    active: users.filter((u) => u.status === "Active").length,
  }), [users]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ name: "", email: "", password: "", role: "Employee", dob: "", department: "", designation: "" });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: AdminUser) => {
    setModalMode("edit");
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      dob: user.dob || "",
      department: user.department || "",
      designation: user.designation || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setMutating(true);

    const { name, email, password, role, dob, department, designation } = formData;

    if (!name.trim() || !email.trim()) {
      setFormError("Name and Email are required.");
      setMutating(false);
      return;
    }

    try {
      if (modalMode === "create") {
        if (!password || password.length < 6) {
          setFormError("Password must be at least 6 characters.");
          setMutating(false);
          return;
        }

        // Create Supabase Auth user (separate non-persisting client)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://dnqnwrsmmihogujhcyng.supabase.co";
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-aq77ehwE74YHYmdQ-SE0Q_2vooOZEY";
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

        const { error: authError } = await authClient.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim(), role }
          }
        });

        if (authError) {
          throw new Error(`Auth creation failed: ${authError.message}`);
        }

        // Insert into employees table
        const { error: dbError } = await supabase.from("employees").insert([{
          full_name: name.trim(),
          official_email: email.trim(),
          role,
          dob: dob || null,
          department: department || "Management",
          status: "Active",
          doj: new Date().toISOString().split("T")[0],
        }]);

        if (dbError) throw dbError;

        pushAudit("created", name.trim(), `Role: ${role}${dob ? ` | DOB: ${dob}` : ""}${department ? ` | Dept: ${department}` : ""}`);
        showToast(`User "${name.trim()}" created successfully.`, "success");
      } else {
        if (editingUserId === null) return;

        const { error: dbError } = await supabase
          .from("employees")
          .update({
            full_name: name.trim(),
            role,
            dob: dob || null,
            department: department || undefined,
          })
          .eq("id", editingUserId);

        if (dbError) throw dbError;

        pushAudit("updated", name.trim(), `Role → ${role}${department ? ` | Dept: ${department}` : ""}`);
        showToast("User updated successfully.", "success");
      }

      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      console.error("[AdminUsers] submit error:", err);
      setFormError(err.message || "An error occurred during submission.");
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    setMutating(true);
    const target = users.find((u) => u.id === deleteConfirmId);
    try {
      const { error: dbError } = await supabase
        .from("employees")
        .delete()
        .eq("id", deleteConfirmId);

      if (dbError) throw dbError;

      pushAudit("deleted", target?.name ?? `ID ${deleteConfirmId}`, `Email: ${target?.email ?? "—"}`);
      showToast("User deleted successfully.", "success");
      setDeleteConfirmId(null);
      fetchUsers();
    } catch (err: any) {
      console.error("[AdminUsers] delete error:", err);
      showToast(err.message || "Failed to delete user.", "error");
    } finally {
      setMutating(false);
    }
  };

  // ── Access Denied ──────────────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/30">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-slate-900">Access Restricted</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">
          This area is restricted to <strong>Founders</strong> and <strong>Co-founders</strong> only.
          Contact your system administrator if you require access.
        </p>
        <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600">
          Your role: {currentUser?.role ?? "Unknown"}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="User Management"
        subtitle="Founders and Co-founders administration dashboard"
        breadcrumb={[{ label: "Home" }, { label: "Administration" }, { label: "Users" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<BookOpen className="h-4 w-4" />}
              onClick={() => setShowAuditLog((v) => !v)}
            >
              Audit Log
              {auditLog.length > 0 && (
                <span className="ml-1.5 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                  {auditLog.length}
                </span>
              )}
            </Button>
            <Button
              variant="gradient"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Add User
            </Button>
          </div>
        }
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-[100] flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {toast.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Stats Row */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "Total Users", value: stats.total, icon: Users, color: "bg-indigo-50 text-indigo-600" },
            { label: "Active", value: stats.active, icon: Activity, color: "bg-emerald-50 text-emerald-600" },
            { label: "Founders", value: stats.founders, icon: Crown, color: "bg-amber-50 text-amber-600" },
            { label: "Co-founders", value: stats.cofounders, icon: Shield, color: "bg-violet-50 text-violet-600" },
            { label: "Employees", value: stats.employees, icon: User, color: "bg-slate-100 text-slate-600" },
          ].map((s) => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 leading-none">{s.value}</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Audit Log Panel */}
      {showAuditLog && (
        <Card className="overflow-hidden border-indigo-100 bg-indigo-50/30">
          <div className="flex items-center justify-between border-b border-indigo-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-800">Audit Log</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                Session
              </span>
            </div>
            <button
              onClick={() => setShowAuditLog(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {auditLog.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400">
              No actions yet this session. Create, edit, or delete a user to start tracking.
            </div>
          ) : (
            <div className="max-h-56 divide-y divide-indigo-100/70 overflow-y-auto">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${
                      entry.action === "created"
                        ? "bg-emerald-500"
                        : entry.action === "deleted"
                        ? "bg-rose-500"
                        : "bg-indigo-500"
                    }`}
                  >
                    {entry.action === "created" ? "+" : entry.action === "deleted" ? "×" : "~"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800">
                      <span className="text-indigo-600">{entry.actor}</span>
                      {" "}{entry.action}{" "}
                      <span className="font-bold">"{entry.target}"</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{entry.detail}</div>
                  </div>
                  <div className="shrink-0 text-[10px] text-slate-400">
                    {new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 max-w-md">
            <Input
              placeholder="Search by name, email, department..."
              leftIcon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-40">
              <option value="All">All Roles</option>
              <option value="Founder">Founder</option>
              <option value="Cofounder">Co-founder</option>
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </Select>
          </div>
        </div>
        {filteredSorted.length !== users.length && (
          <div className="mt-2 text-xs text-slate-500">
            Showing <strong>{filteredSorted.length}</strong> of <strong>{users.length}</strong> users
          </div>
        )}
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="flex min-h-[300px] items-center justify-center p-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-slate-500">Loading user database…</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="flex min-h-[300px] flex-col items-center justify-center border-rose-200 bg-rose-50/50 p-16">
          <AlertTriangle className="h-8 w-8 text-rose-500 mb-2" />
          <p className="text-sm font-bold text-rose-700">Sync Error</p>
          <p className="mt-1 max-w-md text-center text-xs text-rose-600">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={fetchUsers}>
            Retry
          </Button>
        </Card>
      ) : filteredSorted.length === 0 ? (
        <Card className="flex min-h-[300px] items-center justify-center p-16">
          <EmptyState
            icon={<User className="h-6 w-6" />}
            title="No users found"
            description="Try adjusting your filters or search criteria."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">
                    <button
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                      onClick={() => toggleSort("name")}
                    >
                      User <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">
                    <button
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                      onClick={() => toggleSort("role")}
                    >
                      Role <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">DOB</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">
                    <button
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                      onClick={() => toggleSort("created_at")}
                    >
                      Joined <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginated.map((user) => {
                  const roleMeta = ROLE_META[user.role] ?? ROLE_META.Employee;
                  const RoleIcon = roleMeta.icon;
                  return (
                    <tr key={user.id} className="group hover:bg-slate-50/70 transition-colors">
                      {/* User */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} size={36} />
                          <div>
                            <div className="font-semibold text-slate-900">{user.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {user.designation || user.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <a
                          href={`mailto:${user.email}`}
                          className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {user.email}
                        </a>
                      </td>
                      {/* Role */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className="h-3.5 w-3.5 text-slate-400" />
                          <Badge variant={roleMeta.color}>{roleMeta.label}</Badge>
                        </div>
                      </td>
                      {/* Department */}
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500 text-xs">
                        {user.department || "—"}
                      </td>
                      {/* DOB */}
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500 text-xs">
                        {user.dob ? (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(user.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        ) : "—"}
                      </td>
                      {/* Status */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            user.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : user.status === "On Leave"
                              ? "bg-amber-50 text-amber-700"
                              : user.status === "Probation"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === "Active" ? "bg-emerald-500" :
                              user.status === "On Leave" ? "bg-amber-500" :
                              user.status === "Probation" ? "bg-sky-500" : "bg-slate-400"
                            }`}
                          />
                          {user.status}
                        </span>
                      </td>
                      {/* Joined */}
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500 text-xs">
                        {user.doj ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(user.doj).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        ) : user.created_at ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        ) : "—"}
                      </td>
                      {/* Actions */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(user)}
                            title="Edit user"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(user.id)}
                            title="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <div className="text-xs text-slate-500">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                {" "}— <strong>{filteredSorted.length}</strong> users
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === currentPage ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(p as number)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !mutating && setShowModal(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="font-display text-base font-extrabold text-slate-900">
                  {modalMode === "create" ? "Create New User" : "Edit User Profile"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {modalMode === "create"
                    ? "New user will receive a Supabase Auth account."
                    : "Update role, department, and date of birth."}
                </p>
              </div>
              <button
                onClick={() => !mutating && setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="mx-6 mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Arjun Sharma"
                    leftIcon={<User className="h-4 w-4" />}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={mutating}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label="Work Email"
                    type="email"
                    placeholder="you@company.com"
                    leftIcon={<Mail className="h-4 w-4" />}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={mutating || modalMode === "edit"}
                  />
                </div>

                {modalMode === "create" && (
                  <div className="col-span-2">
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      leftIcon={<Lock className="h-4 w-4" />}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      disabled={mutating}
                    />
                  </div>
                )}

                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  disabled={mutating}
                >
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                  <option value="Founder">Founder</option>
                  <option value="Cofounder">Co-founder</option>
                </Select>

                <Input
                  label="Date of Birth"
                  type="date"
                  leftIcon={<CalendarDays className="h-4 w-4" />}
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  disabled={mutating}
                />

                <Input
                  label="Department"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={mutating}
                />

                <Input
                  label="Designation"
                  placeholder="e.g. Senior Engineer"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  disabled={mutating}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={mutating}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  size="md"
                  type="submit"
                  disabled={mutating}
                  rightIcon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                >
                  {modalMode === "create" ? "Create User" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Delete User Account"
        message="Are you sure you want to delete this user? This will permanently remove them from the employees database and cannot be undone."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
