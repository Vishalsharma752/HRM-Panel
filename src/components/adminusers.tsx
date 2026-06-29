import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { 
  Plus, Trash2, ShieldAlert, Loader2, User, Mail, Calendar, 
  ChevronRight, RefreshCw, AlertCircle
} from "lucide-react";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: "founder" | "cofounder" | "employee";
  dob: string;
  created_at?: string;
}

// Database helper functions
const fetchEmployees = async () => {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
  
  // Normalize database fields (handling both 'name'/'full_name' and 'email'/'official_email')
  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: row.name || row.full_name || "Unknown",
    email: row.email || row.official_email || "",
    role: (row.role || "employee").toLowerCase(),
    dob: row.dob || "",
    created_at: row.created_at
  }));
};

const addEmployee = async (employee: Omit<Employee, "id">) => {
  const dbRole = employee.role.charAt(0).toUpperCase() + employee.role.slice(1);
  const { data, error } = await supabase
    .from("employees")
    .insert([
      {
        full_name: employee.name, // Actual database column name
        official_email: employee.email, // Actual database column name
        role: dbRole,
        dob: employee.dob || null,
        status: "Active"
      },
    ])
    .select();

  if (error) {
    console.error("Error adding employee:", error);
    throw error;
  }
  return data;
};

const updateRole = async (id: string, role: string) => {
  const dbRole = role.charAt(0).toUpperCase() + role.slice(1);
  const { data, error } = await supabase
    .from("employees")
    .update({ role: dbRole })
    .eq("id", parseInt(id, 10))
    .select();

  if (error) {
    console.error("Error updating role:", error);
    throw error;
  }
  return data;
};

const deleteEmployee = async (id: string) => {
  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", parseInt(id, 10));

  if (error) {
    console.error("Error deleting employee:", error);
    throw error;
  }
};

interface AdminUsersProps {
  currentUser?: {
    role: string;
    name?: string;
  } | null;
}

export function AdminUsers({ currentUser }: AdminUsersProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"founder" | "cofounder" | "employee">("employee");
  const [dob, setDob] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Access control check: Only founder can access
  const isFounder = currentUser?.role?.toLowerCase() === "founder";

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployees();
      setEmployees(data as Employee[]);
    } catch (err: any) {
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFounder) {
      loadData();
    }
  }, [isFounder]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await addEmployee({ name: name.trim(), email: email.trim(), role, dob });
      setName("");
      setEmail("");
      setDob("");
      setRole("employee");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to add employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await updateRole(id, newRole);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await deleteEmployee(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete employee");
    }
  };

  // Redirect UI for non-founders
  if (!isFounder) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-lg mx-auto mt-12 text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm mb-4 leading-relaxed">
          Only users with the role of <strong>founder</strong> are authorized to access this administration panel.
        </p>
        <a 
          href="/dashboard" 
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition"
        >
          Return to Dashboard <ChevronRight className="w-4 h-4 ml-1" />
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Users Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Add, edit roles, and manage employee accounts</p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition"
          title="Refresh List"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Error encountered</h4>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Add Employee Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Add New Employee</h2>
        <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Full Name" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none transition"
            />
          </div>
          
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="email" 
              placeholder="Email address" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none transition"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none transition"
              title="Date of Birth"
            />
          </div>

          <div className="flex gap-2">
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-indigo-400 focus:outline-none transition appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[right_0.85rem_center] bg-no-repeat pr-8"
            >
              <option value="employee">Employee</option>
              <option value="cofounder">Co-founder</option>
              <option value="founder">Founder</option>
            </select>

            <button 
              type="submit"
              disabled={submitting}
              className="px-4 h-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 font-semibold text-sm shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">DOB</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading employees database...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No employees registered in the database.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{emp.name}</td>
                    <td className="px-6 py-4 text-slate-600">{emp.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={emp.role} 
                        onChange={(e) => handleRoleChange(emp.id, e.target.value)}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs bg-white focus:border-indigo-400 focus:outline-none transition appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[right_0.5rem_center] bg-no-repeat pr-6"
                      >
                        <option value="employee">Employee</option>
                        <option value="cofounder">Co-founder</option>
                        <option value="founder">Founder</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {emp.dob ? new Date(emp.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
