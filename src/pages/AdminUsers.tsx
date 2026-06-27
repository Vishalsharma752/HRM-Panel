import { useState, useEffect, useCallback } from "react";
import { supabase } from "../components/supabase";
import { createClient } from "@supabase/supabase-js";
import {
  ShieldAlert, Plus, Mail, User, Lock, Edit2, Trash2, Search, Loader2, AlertTriangle, Check
} from "lucide-react";
import {
  PageHeader, Card, Button, Avatar, Badge, Input, Select, EmptyState, ConfirmModal
} from "../components/ui";
import { SyncedEmployee, Role } from "../data/store";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: string;
}

export function AdminUsers({ currentUser }: { currentUser: SyncedEmployee | null }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Employee" as Role
  });

  // Loading/error states for mutations
  const [mutating, setMutating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Access Control check
  const hasAccess = currentUser?.role === "Founder" || currentUser?.role === "Cofounder";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("employees")
        .select("id, full_name, name, official_email, email, role, status")
        .order("id", { ascending: true });

      if (dbError) throw dbError;

      if (data) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          name: row.full_name || row.name || "Unknown",
          email: row.official_email || row.email || "",
          role: (row.role || "Employee") as Role,
          status: row.status || "Active"
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

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-md">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-slate-900">Access Denied</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          This area is restricted. Only Founders and Co-founders are authorized to access User Management.
        </p>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ name: "", email: "", password: "", role: "Employee" });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: AdminUser) => {
    setModalMode("edit");
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // Not editable directly from here
      role: user.role
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setMutating(true);

    const { name, email, password, role } = formData;

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

        // Initialize temporary non-persisting client to register auth user
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://dnqnwrsmmihogujhcyng.supabase.co";
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-aq77ehwE74YHYmdQ-SE0Q_2vooOZEY";
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

        // 1. Create Auth user
        const { error: authError } = await authClient.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: name.trim(),
              role: role
            }
          }
        });

        if (authError) {
          throw new Error(`Auth creation failed: ${authError.message}`);
        }

        // 2. Insert into employees database table
        const { error: dbError } = await supabase.from("employees").insert([
          {
            full_name: name.trim(),
            official_email: email.trim(),
            password: password,
            role: role,
            designation: role === "Employee" ? "Employee" : role,
            department: "Management",
            status: "Active",
            location: "India",
            doj: new Date().toISOString().split("T")[0]
          }
        ]);

        if (dbError) throw dbError;

        setToast({ message: `User "${name}" created successfully.`, type: "success" });
      } else {
        // Edit mode (only role update allowed per spec)
        if (editingUserId === null) return;

        const { error: dbError } = await supabase
          .from("employees")
          .update({
            full_name: name.trim(),
            role: role,
            designation: role === "Employee" ? "Employee" : role
          })
          .eq("id", editingUserId);

        if (dbError) throw dbError;

        setToast({ message: "User updated successfully.", type: "success" });
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
    try {
      const { error: dbError } = await supabase
        .from("employees")
        .delete()
        .eq("id", deleteConfirmId);

      if (dbError) throw dbError;

      setToast({ message: "User deleted successfully.", type: "success" });
      setDeleteConfirmId(null);
      fetchUsers();
    } catch (err: any) {
      console.error("[AdminUsers] delete error:", err);
      setToast({ message: err.message || "Failed to delete user.", type: "error" });
    } finally {
      setMutating(false);
    }
  };

  // Filtered List
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === "All" || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Founders and Co-founders administration dashboard"
        breadcrumb={[{ label: "Home" }, { label: "Administration" }, { label: "Users" }]}
        actions={
          <Button variant="gradient" size="md" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Add User
          </Button>
        }
      />

      {/* Toast alert */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {toast.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:max-w-md">
            <Input
              placeholder="Search by name, email..."
              leftIcon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-40">
              <option value="All">All Roles</option>
              <option value="Founder">Founder</option>
              <option value="Cofounder">Cofounder</option>
              <option value="Employee">Employee</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table view */}
      {loading ? (
        <Card className="p-16 flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-slate-500">Loading user database...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-16 border-rose-200 bg-rose-50/50 flex flex-col items-center justify-center min-h-[300px]">
          <AlertTriangle className="h-8 w-8 text-rose-500 mb-2" />
          <p className="text-sm font-bold text-rose-700">Sync Error</p>
          <p className="text-xs text-rose-600 mt-1 max-w-md text-center">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={fetchUsers}>Retry</Button>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-16 flex items-center justify-center min-h-[300px]">
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
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size={36} />
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge
                        variant={
                          user.role === "Founder"
                            ? "indigo"
                            : user.role === "Cofounder"
                            ? "violet"
                            : "neutral"
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(user)}>
                          <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(user.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-md">
            <h3 className="font-display text-lg font-extrabold text-slate-900">
              {modalMode === "create" ? "Create New User" : "Edit User Profile"}
            </h3>

            {formError && (
              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                leftIcon={<User className="h-4 w-4" />}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={mutating}
              />
              <Input
                label="Work Email"
                type="email"
                placeholder="you@tisnx.com"
                leftIcon={<Mail className="h-4 w-4" />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={mutating || modalMode === "edit"}
              />
              {modalMode === "create" && (
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
              )}
              <Select
                label="Role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                disabled={mutating}
              >
                <option value="Employee">Employee</option>
                <option value="Founder">Founder</option>
                <option value="Cofounder">Cofounder</option>
              </Select>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" size="md" onClick={() => setShowModal(false)} type="button" disabled={mutating}>
                  Cancel
                </Button>
                <Button variant="gradient" size="md" type="submit" disabled={mutating} rightIcon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
                  {modalMode === "create" ? "Create User" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Delete User Account"
        message="Are you sure you want to delete this user? This will permanently remove them from the employees database."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
