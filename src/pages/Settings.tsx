import { useState, useMemo, useRef, useCallback } from "react";
import {
  Shield, Smartphone, Plus, Search, MoreHorizontal, Mail, Edit, Check, X, Globe, Clock,
  Lock, User, Key, MapPin, Briefcase, Camera, Upload, Trash2,
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Avatar, Input, Tabs, Toggle, Select, Textarea, BrandLogo } from "../components/ui";

import { type SyncedEmployee, useStore, validatePassword, type ActivityRecord } from "../data/store";
import { departments } from "../data/employees";

const roleMeta: any = {
  Admin: { color: "from-amber-500 to-orange-600", variant: "warning" },
  HR: { color: "from-violet-500 to-fuchsia-600", variant: "violet" },
  Manager: { color: "from-indigo-500 to-violet-600", variant: "indigo" },
  Employee: { color: "from-emerald-500 to-teal-600", variant: "success" },
};

export function Settings({ 
  currentUser,
  onUpdateUser
}: { 
  currentUser: SyncedEmployee;
  onUpdateUser: (user: SyncedEmployee) => void;
}) {
  const isAdmin = currentUser.role === "Admin";
  const [tab, setTab] = useState(isAdmin ? "users" : "profile");
  const [employees, setEmployees] = useStore<SyncedEmployee[]>("employees", []);
  const [, setActivities] = useStore<ActivityRecord[]>("activities", []);
  const [search, setSearch] = useState("");

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SyncedEmployee | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<SyncedEmployee | null>(null);

  // Table action dropdown state
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  // Tab items config based on user role
  const tabItems = useMemo(() => {
    if (isAdmin) {
      return [
        { value: "users", label: "User Management" },
        { value: "roles", label: "Permissions & Roles" },
        { value: "company", label: "Company Settings" },
        { value: "security", label: "Security" },
        { value: "profile", label: "My Profile" },
      ];
    }
    return [
      { value: "profile", label: "My Profile" },
      { value: "security", label: "Security" },
    ];
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    return employees.filter(e => {
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.role.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query)
      );
    });
  }, [employees, search]);

  const handleToggleUserStatus = (empId: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === empId) {
        const nextStatus = e.status === "Active" ? "Inactive" : "Active";
        
        // Log activity
        const activity: ActivityRecord = {
          id: Date.now(),
          user: currentUser.name,
          action: nextStatus === "Active" ? "activated account of" : "deactivated account of",
          target: e.name,
          time: "Just now",
          avatar: e.avatar
        };
        setActivities(prevAct => [activity, ...prevAct]);

        return { ...e, status: nextStatus };
      }
      return e;
    }));
  };

  const handleSaveUser = (userData: any) => {
    if (editingUser) {
      // Edit mode
      setEmployees(prev => prev.map(e => e.id === editingUser.id ? { ...e, ...userData } : e));
      // Log activity
      setActivities(prev => [{
        id: Date.now(),
        user: currentUser.name,
        action: "updated account details of",
        target: editingUser.name,
        time: "Just now",
        avatar: editingUser.avatar
      }, ...prev]);
    } else {
      // Add mode
      const nextIdNum = Math.max(...employees.map(e => {
        const parts = e.id.split("-");
        const num = parseInt(parts[parts.length - 1] || "0", 10);
        return isNaN(num) ? 0 : num;
      }), 0) + 1;
      const padId = String(nextIdNum).padStart(3, "0");
      const id = `EMP-${padId}`;
      const empCode = `TISNX-${padId}`;
      
      const initials = userData.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
      const bgColors = ["#6366f1", "#8b5cf6"];
      const avatarStr = `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgColors[0]}"/><stop offset="100%" stop-color="${bgColors[1]}"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text></svg>`
      )}`;

      const newUser: SyncedEmployee = {
        ...userData,
        id,
        empCode,
        avatar: avatarStr
      };

      setEmployees(prev => [...prev, newUser]);
      // Log activity
      setActivities(prev => [{
        id: Date.now(),
        user: currentUser.name,
        action: "created account for",
        target: newUser.name,
        time: "Just now",
        avatar: newUser.avatar
      }, ...prev]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage users, roles, company settings & security"
        breadcrumb={[{ label: "Home" }, { label: "Settings" }]}
        actions={
          isAdmin ? (
            <Button 
              variant="gradient" 
              size="md" 
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => { setEditingUser(null); setShowUserModal(true); }}
            >
              Invite User
            </Button>
          ) : undefined
        }
      />

      <Card className="p-4">
        <Tabs value={tab} onChange={setTab} items={tabItems} />
      </Card>

      {tab === "users" && isAdmin && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="System Users" subtitle={`${filteredUsers.length} users · 2 roles`} action={
              <div className="flex gap-2">
                <div className="w-56">
                  <Input 
                    placeholder="Search users…" 
                    leftIcon={<Search className="h-4 w-4" />} 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button 
                  variant="secondary" 
                  size="md" 
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                >
                  Add User
                </Button>
              </div>
            } />
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar src={e.avatar} name={e.name} size={36} />
                          <div>
                            <div className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                              {e.name}
                              {e.id === currentUser.id && <Badge variant="indigo" className="text-[9px] px-1 py-0 border-none bg-indigo-50 text-indigo-600">You</Badge>}
                            </div>
                            <div className="text-[11px] text-slate-500">{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${roleMeta[e.role]?.color || "from-slate-500 to-slate-600"} px-2.5 py-0.5 text-[11px] font-bold text-white`}>
                          {e.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5"><Badge variant="indigo">{e.department}</Badge></td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">{e.location || "Bengaluru, IN"}</td>
                      <td className="px-6 py-3.5">
                        <Badge 
                          variant={e.status === "Active" ? "success" : e.status === "Inactive" ? "neutral" : "warning"} 
                          dot={e.status !== "Inactive"}
                        >
                          {e.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right relative" onClick={(ev) => ev.stopPropagation()}>
                        <button 
                          onClick={() => setActiveMenuUserId(activeMenuUserId === e.id ? null : e.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {activeMenuUserId === e.id && (
                          <div className="absolute right-6 top-10 z-10 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl text-left">
                            <button
                              onClick={() => {
                                setEditingUser(e);
                                setShowUserModal(true);
                                setActiveMenuUserId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Edit className="h-3.5 w-3.5 text-slate-400" /> Edit Account
                            </button>
                            <button
                              onClick={() => {
                                handleToggleUserStatus(e.id);
                                setActiveMenuUserId(null);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 ${
                                e.status === "Active" ? "text-rose-600" : "text-emerald-600"
                              }`}
                            >
                              <X className="h-3.5 w-3.5 text-slate-400" /> {e.status === "Active" ? "Disable Account" : "Enable Account"}
                            </button>
                            <button
                              onClick={() => {
                                setResetPasswordUser(e);
                                setShowResetModal(true);
                                setActiveMenuUserId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Shield className="h-3.5 w-3.5 text-slate-400" /> Reset Password
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Pending Invitations" subtitle="3 invites awaiting acceptance" />
              <div className="divide-y divide-slate-100">
                {[
                  { email: "neha.sharma@gmail.com", role: "HR", sent: "2 days ago" },
                  { email: "karan.bisht@outlook.com", role: "Manager", sent: "3 days ago" },
                  { email: "aanya.kapoor@yahoo.com", role: "Employee", sent: "5 days ago" },
                ].map((i) => (
                  <div key={i.email} className="flex items-center gap-3 px-6 py-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Mail className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{i.email}</div>
                      <div className="text-[11px] text-slate-500">Role: {i.role} · Sent {i.sent}</div>
                    </div>
                    <Button variant="secondary" size="sm">Resend</Button>
                    <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Role Distribution" subtitle="Active users by role" />
              <div className="space-y-3 p-6 pt-2">
                {[
                  { role: "Admin", count: employees.filter(e => e.role === "Admin").length, color: "from-amber-500 to-orange-600" },
                  { role: "Employee", count: employees.filter(e => e.role === "Employee").length, color: "from-emerald-500 to-teal-600" },
                ].map(r => (
                  <div key={r.role}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{r.role}</span>
                      <span className="font-bold text-slate-900">{r.count} users</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full bg-gradient-to-r ${r.color}`} style={{ width: `${(r.count / (employees.length || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "roles" && isAdmin && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries({
              Admin: { perms: "Full system access", users: employees.filter(e => e.role === "Admin").length, color: "from-amber-500 to-orange-600" },
              HR: { perms: "HR, payroll, employee data", users: 3, color: "from-violet-500 to-fuchsia-600" },
              Manager: { perms: "Team, attendance, leave approval", users: 12, color: "from-indigo-500 to-violet-600" },
              Employee: { perms: "Self-service portal only", users: employees.filter(e => e.role === "Employee").length, color: "from-emerald-500 to-teal-600" },
            }).map(([role, info]: any) => (
              <div key={role} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl ${info.color}`} />
                <div className="relative">
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${info.color}`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="font-display text-base font-extrabold text-slate-900">{role}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{info.perms}</div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <Badge variant="indigo">{info.users} users</Badge>
                    <Button variant="ghost" size="sm" leftIcon={<Edit className="h-3.5 w-3.5" />}>Edit</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader title="Permission Matrix" subtitle="Granular access control per module" />
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3.5">Module / Action</th>
                    <th className="px-6 py-3.5 text-center">Admin</th>
                    <th className="px-6 py-3.5 text-center">HR</th>
                    <th className="px-6 py-3.5 text-center">Manager</th>
                    <th className="px-6 py-3.5 text-center">Employee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { module: "View Employees", a: true, h: true, m: true, e: true },
                    { module: "Add/Edit Employee", a: true, h: true, m: false, e: false },
                    { module: "Approve Leave", a: true, h: true, m: true, e: false },
                    { module: "Mark Attendance (Team)", a: true, h: true, m: true, e: false },
                    { module: "View Reports", a: true, h: true, m: true, e: false },
                    { module: "Run Payroll", a: true, h: true, m: false, e: false },
                    { module: "Manage Departments", a: true, h: true, m: false, e: false },
                    { module: "System Settings", a: true, h: false, m: false, e: false },
                    { module: "View Own Payslip", a: true, h: true, m: true, e: true },
                    { module: "Apply for Leave", a: true, h: true, m: true, e: true },
                  ].map((r) => (
                    <tr key={r.module} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 text-sm font-semibold text-slate-800">{r.module}</td>
                      {["a", "h", "m", "e"].map(k => (
                        <td key={k} className="px-6 py-3.5 text-center">
                          {(r as any)[k] ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                              <X className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "company" && isAdmin && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6">
            <h3 className="font-display text-base font-extrabold text-slate-900">Company Information</h3>
            <p className="mt-0.5 text-xs text-slate-500">Public details shown on payslips, emails and login page</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Input label="Company Name" defaultValue="TIS Nexus Pvt. Ltd." />
              <Input label="Registration No." defaultValue="U72900MH2019PTC123456" />
              <Input label="Email" defaultValue="hello@tisnx.com" leftIcon={<Mail className="h-4 w-4" />} />
              <Input label="Phone" defaultValue="+91 87663 08064" leftIcon={<Smartphone className="h-4 w-4" />} />
              <Input label="Website" defaultValue="https://www.tisnx.com" leftIcon={<Globe className="h-4 w-4" />} />
              <Input label="GST No." defaultValue="27AABCT1234M1Z9" />
              <Select label="Time Zone" defaultValue="IST">
                <option>IST (UTC+5:30)</option><option>UTC</option><option>EST (UTC-5:00)</option>
              </Select>
              <Select label="Currency" defaultValue="INR">
                <option>INR — Indian Rupee</option><option>USD — US Dollar</option><option>EUR — Euro</option>
              </Select>
              <Input label="Address" defaultValue="3rd Floor, Tech Park, Andheri West" className="col-span-2" />
              <Textarea label="About" defaultValue="India's #1 B2B Buyer Generation Company — 120 Verified Buyers Guaranteed." className="col-span-2" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="md">Cancel</Button>
              <Button variant="primary" size="md">Save Changes</Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-display text-base font-extrabold text-slate-900">Branding</h3>
              <p className="mt-0.5 text-xs text-slate-500">Logo and accent color for the portal</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
                  <BrandLogo compact />
                </div>
                <div>
                  <Button variant="secondary" size="sm">Upload Logo</Button>
                  <div className="mt-1 text-[11px] text-slate-500">PNG, JPG up to 2MB</div>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold text-slate-700">Accent Color</div>
                <div className="flex flex-wrap gap-2">
                  {["#025085", "#00538C", "#E81D3B", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6"].map(c => (
                    <button key={c} className="h-9 w-9 rounded-xl ring-2 ring-offset-2 transition-all hover:scale-110" style={{ background: c, boxShadow: c === "#025085" ? "0 0 0 2px white, 0 0 0 4px #025085" : "0 0 0 2px white, 0 0 0 4px transparent" }} />
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-display text-base font-extrabold text-slate-900">Working Hours</h3>
              <p className="mt-0.5 text-xs text-slate-500">Default office hours for all employees</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Input label="Start" type="time" defaultValue="10:00" leftIcon={<Clock className="h-4 w-4" />} />
                <Input label="End" type="time" defaultValue="18:00" leftIcon={<Clock className="h-4 w-4" />} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-sm font-semibold text-slate-700">Geo-fencing enabled</span>
                <Toggle checked onChange={() => {}} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Change Password Panel */}
          <ChangePasswordCard currentUser={currentUser} setEmployees={setEmployees} onUpdateUser={onUpdateUser} />

          <Card className="p-6">
            <h3 className="font-display text-base font-extrabold text-slate-900">Authentication Policy</h3>
            <p className="mt-0.5 text-xs text-slate-500">Configure login security policies</p>
            <div className="mt-5 space-y-3">
              {[
                { label: "Two-Factor Authentication (2FA)", desc: "Required for Admin & HR roles", on: true },
                { label: "Single Sign-On (SSO)", desc: "Google Workspace integration", on: true },
                { label: "Password Expiry", desc: "Force reset every 90 days", on: true },
                { label: "IP Whitelisting", desc: "Restrict to office & VPN", on: false },
                { label: "Session Timeout", desc: "Auto-logout after 30 min idle", on: true },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                    <div className="text-[11px] text-slate-500">{s.desc}</div>
                  </div>
                  <Toggle checked={s.on} onChange={() => {}} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "profile" && (
        <MyProfileCard currentUser={currentUser} setEmployees={setEmployees} onUpdateUser={onUpdateUser} />
      )}

      {/* MODALS */}
      {showUserModal && (
        <UserFormModal 
          employee={editingUser} 
          onClose={() => { setShowUserModal(false); setEditingUser(null); }} 
          onSave={handleSaveUser} 
        />
      )}

      {showResetModal && resetPasswordUser && (
        <ResetPasswordModal 
          employee={resetPasswordUser} 
          onClose={() => { setShowResetModal(false); setResetPasswordUser(null); }}
          setEmployees={setEmployees}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS
   ────────────────────────────────────────────────────────────────────────────── */

// --- 1. Reset Password Modal (Admin Use) ---
function ResetPasswordModal({
  employee,
  onClose,
  setEmployees
}: {
  employee: SyncedEmployee;
  onClose: () => void;
  setEmployees: any;
}) {
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPwd !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }

    const validationErr = validatePassword(newPwd);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    // Update password in database
    setEmployees((prev: SyncedEmployee[]) =>
      prev.map(emp => (emp.id === employee.id ? { ...emp, password: newPwd } : emp))
    );

    alert(`Password reset successfully for ${employee.name}.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-display text-base font-extrabold text-slate-900">Reset Password</h3>
            <p className="text-[11px] text-slate-500">Reset password for {employee.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-700">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-4">
          <Input 
            label="New password" 
            type="password" 
            placeholder="Min 8 chars, 1 uppercase, 1 symbol/number" 
            leftIcon={<Lock className="h-4 w-4" />} 
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            required
          />
          <Input 
            label="Confirm password" 
            type="password" 
            placeholder="Repeat new password" 
            leftIcon={<Lock className="h-4 w-4" />} 
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            required
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-slate-700">Password requirements</div>
            <ul className="mt-1.5 space-y-1 text-slate-500">
              <li>✓ At least 8 characters</li>
              <li>✓ One uppercase letter</li>
              <li>✓ One number or symbol</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="gradient" size="md">Reset Password</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// --- 2. Create/Edit User Modal (Admin Use) ---
function UserFormModal({
  employee,
  onClose,
  onSave
}: {
  employee?: SyncedEmployee | null;
  onClose: () => void;
  onSave: (data: any) => void;
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
  const [status, setStatus] = useState<SyncedEmployee["status"]>(employee?.status || "Active");
  const [location, setLocation] = useState(employee?.location || "Bengaluru, IN");
  const [joinDate, setJoinDate] = useState(employee?.joinDate || new Date().toISOString().split("T")[0]);
  const [manager, setManager] = useState(employee?.manager || "");
  const [salary, setSalary] = useState(employee?.salary?.toString() || "");
  const [pwd, setPwd] = useState(employee?.password || "Password123!");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !designation.trim()) {
      setError("Name, email and designation are required.");
      return;
    }

    // Only validate password strength when it is changed or for new accounts
    if (!employee || pwd !== employee.password) {
      const validationErr = validatePassword(pwd);
      if (validationErr) {
        setError(validationErr);
        return;
      }
    }

    const payload: any = {
      name,
      email,
      phone,
      department,
      designation,
      role,
      status,
      location,
      joinDate,
      manager: manager || undefined,
      salary: salary ? parseInt(salary) : undefined,
      password: pwd
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-900">
              {employee ? "Edit User Account" : "Create New User"}
            </h2>
            <p className="text-xs text-slate-500">Configure role privileges, profile and credentials</p>
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
            <Input label="Email Address" type="email" placeholder="aarav.gupta@tisnx.com" leftIcon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Phone Number" placeholder="+91 98765 43210" leftIcon={<Smartphone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {departments.map(d => <option key={d.name}>{d.name}</option>)}
            </Select>
            <Input label="Designation" placeholder="Senior Software Engineer" leftIcon={<Briefcase className="h-4 w-4" />} value={designation} onChange={(e) => setDesignation(e.target.value)} required />
            <Select label="System Role" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="Employee">Employee (Self Service)</option>
              <option value="Admin">Admin (Boss Privileges)</option>
            </Select>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Probation">Probation</option>
              <option value="Inactive">Inactive (Deactivated)</option>
            </Select>
            <Select label="Location" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option>Bengaluru, IN</option>
              <option>Mumbai, IN</option>
              <option>Noida, IN</option>
              <option>Remote</option>
            </Select>
            <Input label="Date of Joining" type="date" leftIcon={<Clock className="h-4 w-4" />} value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
            <Input label="Manager Name" placeholder="Vikram Iyer" leftIcon={<User className="h-4 w-4" />} value={manager} onChange={(e) => setManager(e.target.value)} />
            <Input label="Annual Salary (INR)" type="number" placeholder="1850000" leftIcon={<Key className="h-4 w-4" />} value={salary} onChange={(e) => setSalary(e.target.value)} />
            <Input label="Account Password" type="text" placeholder="Enter secure password" leftIcon={<Lock className="h-4 w-4" />} value={pwd} onChange={(e) => setPwd(e.target.value)} required />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gradient" size="md">
            {employee ? "Save Changes" : "Create Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// --- 3. Change Password Card (Self-Service) ---
function ChangePasswordCard({
  currentUser,
  setEmployees,
  onUpdateUser
}: {
  currentUser: SyncedEmployee;
  setEmployees: any;
  onUpdateUser: (user: SyncedEmployee) => void;
}) {
  const [currPwd, setCurrPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const storedUserPwd = currentUser.password || "Password123!";
    if (currPwd !== storedUserPwd) {
      setError("Current password verification failed.");
      return;
    }

    if (newPwd !== confirmPwd) {
      setError("New password and confirmation do not match.");
      return;
    }

    const validationErr = validatePassword(newPwd);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    // Update inside employees list
    setEmployees((prev: SyncedEmployee[]) =>
      prev.map(emp => {
        if (emp.id === currentUser.id) {
          const updated = { ...emp, password: newPwd };
          // Propagate change
          onUpdateUser(updated);
          return updated;
        }
        return emp;
      })
    );

    setSuccess("Password updated successfully!");
    setCurrPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };

  return (
    <Card className="p-6">
      <h3 className="font-display text-base font-extrabold text-slate-900">Change Password</h3>
      <p className="mt-0.5 text-xs text-slate-500">Update your account credentials regularly</p>
      
      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-semibold text-emerald-700">
          ✓ {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Input 
          label="Current Password" 
          type="password" 
          placeholder="Verify current password" 
          leftIcon={<Lock className="h-4 w-4" />} 
          value={currPwd}
          onChange={(e) => setCurrPwd(e.target.value)}
          required
        />
        <Input 
          label="New Password" 
          type="password" 
          placeholder="At least 8 characters, one uppercase, one number/symbol" 
          leftIcon={<Lock className="h-4 w-4" />} 
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          required
        />
        <Input 
          label="Confirm New Password" 
          type="password" 
          placeholder="Verify new password" 
          leftIcon={<Lock className="h-4 w-4" />} 
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          required
        />
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs">
          <div className="font-semibold text-slate-700">Password requirements</div>
          <ul className="mt-1.5 space-y-1 text-slate-500">
            <li>✓ At least 8 characters</li>
            <li>✓ One uppercase letter</li>
            <li>✓ One number or symbol</li>
          </ul>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">Update Password</Button>
        </div>
      </form>
    </Card>
  );
}

// --- 4. Personal Profile Card (Self-Service) ---
function MyProfileCard({
  currentUser,
  setEmployees,
  onUpdateUser
}: {
  currentUser: SyncedEmployee;
  setEmployees: any;
  onUpdateUser: (user: SyncedEmployee) => void;
}) {
  const [name, setName]         = useState(currentUser.name);
  const [phone, setPhone]       = useState(currentUser.phone || "");
  const [location, setLocation] = useState(currentUser.location || "Bengaluru, IN");
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar || "");
  const [success, setSuccess]   = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File → base64 ────────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image file (JPG, PNG, GIF, WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    if (!name.trim()) return;

    setEmployees((prev: SyncedEmployee[]) =>
      prev.map(emp => {
        if (emp.id === currentUser.id) {
          const updated = { ...emp, name, phone, location, avatar: avatarUrl || emp.avatar };
          onUpdateUser(updated);
          return updated;
        }
        return emp;
      })
    );
    setSuccess("Profile information saved successfully!");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Personal Information ─────────────────────────────────────────── */}
      <Card className="lg:col-span-2 p-6">
        <h3 className="font-display text-base font-extrabold text-slate-900">Personal Information</h3>
        <p className="mt-0.5 text-xs text-slate-500">Update your display identity and contact details</p>

        {success && (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-semibold text-emerald-700">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Aarav Gupta" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Work Email (Read Only)" type="email" value={currentUser.email} readOnly disabled leftIcon={<Mail className="h-4 w-4" />} />
            <Input label="Phone Number" placeholder="+91 98765 43210" leftIcon={<Smartphone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Location" placeholder="Bengaluru, IN" leftIcon={<MapPin className="h-4 w-4" />} value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input label="Designation (Read Only)" value={currentUser.designation} readOnly disabled leftIcon={<Briefcase className="h-4 w-4" />} />
            <Input label="Department (Read Only)" value={currentUser.department} readOnly disabled leftIcon={<User className="h-4 w-4" />} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" variant="primary" size="md">Save Changes</Button>
          </div>
        </form>
      </Card>

      {/* ── Profile Photo Upload ──────────────────────────────────────────── */}
      <Card className="p-6 h-fit">
        <h3 className="font-display text-base font-extrabold text-slate-900">Profile Photo</h3>
        <p className="mt-0.5 text-xs text-slate-500">JPG, PNG, GIF, WebP · Max 2 MB</p>

        {/* Avatar preview */}
        <div className="mt-5 flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-slate-100 ring-offset-2 transition-all group-hover:ring-indigo-200">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-2xl">
                  {name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
              )}
            </div>
            {/* Camera overlay button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-2 ring-white transition-all hover:bg-indigo-700 hover:scale-110 active:scale-95"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Drag & drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                isDragging ? "bg-indigo-100 text-indigo-600" : "bg-white text-slate-400 shadow-sm"
              }`}>
                <Upload className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                {isDragging ? "Drop photo here" : "Click or drag & drop"}
              </div>
              <div className="text-[10px] text-slate-400">JPG, PNG, GIF, WebP up to 2 MB</div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Error */}
          {uploadError && (
            <div className="w-full rounded-xl bg-rose-50 border border-rose-100 p-3 text-[11px] font-semibold text-rose-700">
              ⚠️ {uploadError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-center"
            >
              Upload New Photo
            </Button>
            {avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => { setAvatarUrl(""); setUploadError(""); }}
                className="w-full justify-center text-rose-600 hover:bg-rose-50"
              >
                Remove Photo
              </Button>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            Photo is saved when you click <strong>Save Changes</strong> on the left panel.
          </p>
        </div>
      </Card>
    </div>
  );
}
