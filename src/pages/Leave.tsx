import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar, Check, X, Download, Plus, Plane, Heart, Briefcase, Coffee,
  Clock, Users, Search, FileText,
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Avatar, Input, Tabs, Textarea } from "../components/ui";
import { useStore, SyncedEmployee, LeaveRequest, ActivityRecord } from "../data/store";
import { supabase } from "../components/supabase";

const statusMeta: any = { Pending: "warning", Approved: "success", Rejected: "danger" };
const typeMeta: any = {
  "Sick Leave": { icon: Heart, color: "from-rose-500 to-pink-600", bg: "bg-rose-50 text-rose-700" },
  "Casual Leave": { icon: Coffee, color: "from-amber-500 to-orange-600", bg: "bg-amber-50 text-amber-700" },
  "Earned Leave": { icon: Plane, color: "from-indigo-500 to-violet-600", bg: "bg-indigo-50 text-indigo-700" },
  "Work From Home": { icon: Briefcase, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50 text-emerald-700" },
};

export function Leave({ currentUser, search, setSearch }: { currentUser: SyncedEmployee; search?: string; setSearch?: (s: string) => void }) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees] = useStore<SyncedEmployee[]>("employees", []);
  const [, setActivities] = useStore<ActivityRecord[]>("activities", []);

  const [tab, setTab] = useState("pending");
  const [showApply, setShowApply] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const searchVal = search !== undefined ? search : localSearch;
  const onSearchChange = setSearch !== undefined ? setSearch : setLocalSearch;

  // Immediate input state
  const [inputValue, setInputValue] = useState(searchVal);

  // Debounced search state used for actual list filtering
  const [debouncedSearch, setDebouncedSearch] = useState(searchVal);

  // Sync input value with searchVal from parent/navigation
  useEffect(() => {
    setInputValue(searchVal);
  }, [searchVal]);

  // Debounce the state update of both the internal filter and the parent state
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
      if (inputValue !== searchVal) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [inputValue, onSearchChange, searchVal]);

  // Resolve employee record by email — returns {id, emp_code}
  async function resolveEmployee(email: string): Promise<{ id: number; empCode: string } | null> {
    try {
      const { data } = await supabase
        .from("employees")
        .select("id, emp_code")
        .ilike("official_email", email.trim())
        .maybeSingle();
      if (!data) return null;
      return { id: Number(data.id), empCode: data.emp_code || "" };
    } catch {
      return null;
    }
  }

  const isAdmin = currentUser.role === "Admin" || currentUser.role === "Founder" || currentUser.role === "Cofounder";

  const fetchLeaves = useCallback(async () => {
    try {
      // Fetch all columns — handles both old schema (leave_type/start_date/end_date)
      // AND new schema (type/from_date/to_date/days/emp_code) gracefully
      const { data, error: sbErr } = await supabase
        .from("leave_requests")
        .select("id, emp_code, employee_id, leave_type, start_date, end_date, type, from_date, to_date, days, reason, status, created_at")
        .order("created_at", { ascending: false });

      if (sbErr) throw sbErr;
      if (!data || data.length === 0) { setLeaves([]); return; }

      // Collect all emp_codes from leave_requests to batch-fetch employee info
      const empCodes = [...new Set(data.map((r: any) => r.emp_code).filter(Boolean))];
      let empCodeMap: Record<string, { full_name: string; department: string }> = {};

      if (empCodes.length > 0) {
        const { data: empData } = await supabase
          .from("employees")
          .select("emp_code, full_name, department")
          .in("emp_code", empCodes);
        if (empData) {
          empData.forEach((e: any) => {
            empCodeMap[e.emp_code] = { full_name: e.full_name || "Unknown", department: e.department || "General" };
          });
        }
      }

      const mapped: LeaveRequest[] = data.map((row: any) => {
        // Normalize column names — support both old and new schema
        const leaveType = row.type || row.leave_type || "Casual Leave";
        const fromDate = row.from_date || row.start_date || "";
        const toDate = row.to_date || row.end_date || "";
        const leaveDays = row.days || (
          fromDate && toDate
            ? Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000) + 1)
            : 1
        );

        // Resolve employee name — prefer emp_code lookup, fall back to Unknown
        const empInfo = row.emp_code
          ? empCodeMap[row.emp_code] || { full_name: row.emp_code, department: "General" }
          : { full_name: "Unknown", department: "General" };

        return {
          id: `LV-${row.id}`,
          empCode: row.emp_code || "",
          employee: empInfo.full_name,
          department: empInfo.department,
          type: leaveType,
          from: fromDate,
          to: toDate,
          days: leaveDays,
          reason: row.reason || "",
          status: row.status || "Pending",
          avatar: `data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${(empInfo.full_name || "U").split(" ").map((p: any) => p[0]).slice(0, 2).join("").toUpperCase()}</text></svg>`
          )}`
        };
      });

      const filtered = mapped.filter(l => isAdmin || l.empCode === currentUser.empCode || l.employee === currentUser.name);
      setLeaves(filtered);
    } catch (err: any) {
      console.error("Failed to fetch leaves:", err.message);
    }
  }, [currentUser.name, currentUser.empCode, isAdmin]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleApplyLeave = async (newLeave: Omit<LeaveRequest, "id" | "employee" | "department" | "status" | "avatar">) => {
    // Resolve employee record by email
    const empRecord = await resolveEmployee(currentUser.email);
    const empCode = empRecord?.empCode || currentUser.empCode || null;

    if (!empCode) {
      console.error("Could not resolve emp_code for:", currentUser.email);
      alert("Could not find your employee record. Please contact admin.");
      return;
    }

    // Insert with BOTH old and new column names so it works regardless of schema version
    const dbRow: Record<string, any> = {
      emp_code: empCode,
      // New column names (added by migration)
      type: newLeave.type,
      from_date: newLeave.from,
      to_date: newLeave.to,
      days: newLeave.days,
      // Old column names (original schema) — Supabase ignores extra columns gracefully
      leave_type: newLeave.type,
      start_date: newLeave.from,
      end_date: newLeave.to,
      reason: newLeave.reason,
      status: "Pending"
    };

    try {
      const { error: sbErr } = await supabase.from("leave_requests").insert([dbRow]);
      if (sbErr) {
        // If extra columns don't exist yet, retry with just the original schema columns
        const fallbackRow = {
          emp_code: empCode,
          leave_type: newLeave.type,
          start_date: newLeave.from,
          end_date: newLeave.to,
          reason: newLeave.reason,
          status: "Pending"
        };
        const { error: fallbackErr } = await supabase.from("leave_requests").insert([fallbackRow]);
        if (fallbackErr) throw fallbackErr;
      }

      await fetchLeaves();

      const activity: ActivityRecord = {
        id: Date.now(),
        user: currentUser.name,
        action: "applied for",
        target: `${newLeave.type} (${newLeave.days} days)`,
        time: "Just now",
        avatar: currentUser.avatar
      };
      setActivities(prev => [activity, ...prev]);
    } catch (err: any) {
      console.error("Failed to apply leave:", err.message);
      alert("Failed to submit leave request: " + err.message);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    // id is "LV-{uuid}" — extract the UUID part
    const rawId = leaveId.replace("LV-", "");
    if (!rawId) return;

    const approvedLeave = leaves.find(l => l.id === leaveId);
    if (!approvedLeave) return;

    try {
      // 1. Update status in leave_requests
      const { error: sbErr } = await supabase
        .from("leave_requests")
        .update({ status: "Approved" })
        .eq("id", rawId);
      if (sbErr) throw sbErr;

      // 2. Generate date range and upsert to attendance table
      const dates: string[] = [];
      const start = new Date(approvedLeave.from);
      const end = new Date(approvedLeave.to);
      const temp = new Date(start);
      while (temp <= end) {
        const year = temp.getFullYear();
        const month = String(temp.getMonth() + 1).padStart(2, "0");
        const day = String(temp.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
        temp.setDate(temp.getDate() + 1);
      }

      const matchedEmp = employees.find(e => e.name === approvedLeave.employee);
      // Use emp_code (TEXT) for upsert — matches the attendance table's primary identifier
      const empCode = matchedEmp?.empCode || null;
      const dbEmpId = matchedEmp ? (await resolveEmployeeDbId(matchedEmp.email)) : null;
      if (empCode) {
        const upsertRows = dates.map(dStr => ({
          emp_code: empCode,
          attendance_date: dStr,
          check_in: "—",
          check_out: "—",
          status: "On Leave"
        }));
        const { error: upsertErr } = await supabase
          .from("attendance")
          .upsert(upsertRows, { onConflict: "emp_code,attendance_date" });
        if (upsertErr) console.warn("[Leave] Attendance upsert error (non-fatal):", upsertErr.message);

        // 3. Update employee status to "On Leave"
        const { error: empErr } = await supabase
          .from("employees")
          .update({ status: "On Leave" })
          .eq("id", dbEmpId);
        if (empErr) throw empErr;

        // Trigger Approved Leave email notification via Resend
        if (matchedEmp?.email) {
          try {
            const backendUrl = window.location.port === "5173"
              ? "http://localhost:3000/api/auth/send-notification-email"
              : "/api/auth/send-notification-email";
            await fetch(backendUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: matchedEmp.email,
                templateType: "LeaveApproved",
                data: {
                  name: approvedLeave.employee,
                  fromDate: approvedLeave.from,
                  toDate: approvedLeave.to,
                  days: approvedLeave.days,
                  reason: approvedLeave.reason
                }
              })
            });
          } catch (mailErr) {
            console.warn("[Leave] Approve notification send error:", mailErr);
          }
        }
      }

      await fetchLeaves();

      // Activity log
      const activity: ActivityRecord = {
        id: Date.now(),
        user: currentUser.name,
        action: "approved leave request for",
        target: approvedLeave.employee,
        time: "Just now",
        avatar: currentUser.avatar
      };
      setActivities(prev => [activity, ...prev]);
    } catch (err: any) {
      console.error("Failed to approve leave:", err.message);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    // id is "LV-{uuid}" — extract the UUID part
    const rawId = leaveId.replace("LV-", "");
    if (!rawId) return;

    const approvedLeave = leaves.find(l => l.id === leaveId);
    if (!approvedLeave) return;

    try {
      const { error: sbErr } = await supabase
        .from("leave_requests")
        .update({ status: "Rejected" })
        .eq("id", rawId);
      if (sbErr) throw sbErr;

      await fetchLeaves();

      // Trigger Rejected Leave email notification via Resend
      const matchedEmp = employees.find(e => e.name === approvedLeave.employee);
      if (matchedEmp?.email) {
        try {
          const backendUrl = window.location.port === "5173"
            ? "http://localhost:3000/api/auth/send-notification-email"
            : "/api/auth/send-notification-email";
          await fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: matchedEmp.email,
              templateType: "LeaveRejected",
              data: {
                name: approvedLeave.employee,
                fromDate: approvedLeave.from,
                toDate: approvedLeave.to,
                days: approvedLeave.days,
                reason: approvedLeave.reason
              }
            })
          });
        } catch (mailErr) {
          console.warn("[Leave] Reject notification send error:", mailErr);
        }
      }

      // Activity log
      const activity: ActivityRecord = {
        id: Date.now(),
        user: currentUser.name,
        action: "rejected leave request for",
        target: approvedLeave.employee,
        time: "Just now",
        avatar: currentUser.avatar
      };
      setActivities(prev => [activity, ...prev]);
    } catch (err: any) {
      console.error("Failed to reject leave:", err.message);
    }
  };

  // Filter requests
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (!isAdmin && l.employee !== currentUser.name) return false;

      if (tab === "pending" && l.status !== "Pending") return false;
      if (tab === "approved" && l.status !== "Approved") return false;
      if (tab === "rejected" && l.status !== "Rejected") return false;

      if (debouncedSearch && !l.employee.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;

      return true;
    });
  }, [leaves, tab, debouncedSearch, currentUser, isAdmin]);

  // Stats computation
  const stats = useMemo(() => {
    const activeLeavesList = isAdmin ? leaves : leaves.filter(l => l.employee === currentUser.name);
    const pending = activeLeavesList.filter(l => l.status === "Pending").length;
    const approved = activeLeavesList.filter(l => l.status === "Approved").length;
    const rejected = activeLeavesList.filter(l => l.status === "Rejected").length;
    
    const today = new Date().toISOString().split("T")[0];
    const onLeaveToday = leaves.filter(l => l.status === "Approved" && today >= l.from && today <= l.to).length;

    return { pending, approved, rejected, onLeaveToday };
  }, [leaves, currentUser, isAdmin]);

  // Leave balances for current user
  const myLeaves = useMemo(() => leaves.filter(l => l.employee === currentUser.name && l.status === "Approved"), [leaves, currentUser]);
  const casualUsed = myLeaves.filter(l => l.type === "Casual Leave").reduce((sum, l) => sum + l.days, 0);
  const sickUsed = myLeaves.filter(l => l.type === "Sick Leave").reduce((sum, l) => sum + l.days, 0);
  const earnedUsed = myLeaves.filter(l => l.type === "Earned Leave").reduce((sum, l) => sum + l.days, 0);
  const wfhUsed = myLeaves.filter(l => l.type === "Work From Home").reduce((sum, l) => sum + l.days, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle={isAdmin ? "Approve, review, and track company leaves" : "Apply and manage your leave requests"}
        breadcrumb={[{ label: "Home" }, { label: "Operations" }, { label: "Leave" }]}
        actions={
          <>
            <Button variant="secondary" size="md" leftIcon={<Download className="h-4 w-4" />}>Export</Button>
            <Button variant="gradient" size="md" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowApply(true)}>Apply Leave</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Pending Requests", value: stats.pending.toString(), icon: <Clock className="h-5 w-5" />, color: "from-amber-500 to-orange-600", delta: isAdmin ? "needs review" : "submitted" },
          { label: "Approved Requests", value: stats.approved.toString(), icon: <Check className="h-5 w-5" />, color: "from-emerald-500 to-teal-600", delta: "active history" },
          { label: "On Leave Today", value: stats.onLeaveToday.toString(), icon: <Plane className="h-5 w-5" />, color: "from-indigo-500 to-violet-600", delta: "entire workforce" },
          { label: "Rejected Requests", value: stats.rejected.toString(), icon: <X className="h-5 w-5" />, color: "from-rose-500 to-pink-600", delta: "historical log" },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
                <div className="mt-2 font-display text-2xl font-extrabold text-slate-900">{s.value}</div>
                <div className="mt-1 text-[11px] text-slate-500">{s.delta}</div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg shadow-indigo-500/20 ${s.color}`}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onChange={setTab} items={[
            { value: "pending", label: "Pending", count: stats.pending },
            { value: "approved", label: "Approved", count: stats.approved },
            { value: "rejected", label: "Rejected", count: stats.rejected },
            { value: "all", label: "All Requests" },
          ]} />
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-56">
                 <Input placeholder="Search employee…" leftIcon={<Search className="h-4 w-4" />} value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader
          title={tab === "pending" ? "Pending Approvals" : tab === "approved" ? "Approved Leaves" : tab === "rejected" ? "Rejected Leaves" : "All Leave Requests"}
          subtitle={isAdmin ? "Review and take action on leave applications" : "Your leave request history"}
          action={<Badge variant="info">{filteredLeaves.length} requests</Badge>}
        />
        <div className="divide-y divide-slate-100">
          {filteredLeaves.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 bg-slate-50/20">No leave requests available</div>
          ) : (
            filteredLeaves.map((l) => {
              const tm = typeMeta[l.type] || typeMeta["Casual Leave"];
              const Icon = tm.icon;
              return (
                <div key={l.id} className="group flex flex-col gap-3 p-5 transition-all duration-200 hover:bg-gray-50 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <Avatar src={l.avatar} name={l.employee} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{l.employee}</span>
                        <Badge variant="indigo">{l.department}</Badge>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tm.bg}`}>
                          <Icon className="h-3 w-3" /> {l.type}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {l.from} → {l.to}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-700">{l.days} day{l.days > 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {l.id}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-slate-600 line-clamp-1">
                        <span className="font-semibold text-slate-700">Reason:</span> {l.reason}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <Badge variant={statusMeta[l.status]} dot>{l.status}</Badge>
                    {isAdmin && l.status === "Pending" && (
                      <div className="flex gap-1.5 mt-2 sm:mt-0">
                        <Button variant="danger" size="sm" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => handleRejectLeave(l.id)}>Reject</Button>
                        <Button variant="primary" size="sm" leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => handleApproveLeave(l.id)}>Approve</Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Balance + Calendar Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leave Balance for Current User */}
        <Card>
          <CardHeader title="Your Leave Balance" subtitle="FY 2024–25" />
          <div className="space-y-4 p-6 pt-2">
            {[
              { label: "Casual Leave", used: casualUsed, total: 12, color: "from-amber-500 to-orange-500" },
              { label: "Sick Leave", used: sickUsed, total: 8, color: "from-rose-500 to-pink-500" },
              { label: "Earned Leave", used: earnedUsed, total: 20, color: "from-indigo-500 to-violet-500" },
              { label: "Work From Home", used: wfhUsed, total: 24, color: "from-emerald-500 to-teal-500" },
            ].map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{b.label}</span>
                  <span className="font-bold text-slate-900">{Math.max(0, b.total - b.used)} / {b.total} left</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full bg-gradient-to-r ${b.color}`} style={{ width: `${(Math.max(0, b.total - b.used) / b.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Team Leave Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader title="Team Leave Calendar" subtitle="Overview" />
          <div className="p-6 pt-2">
            <div className="divide-y divide-slate-100">
              {leaves.filter(l => l.status === "Approved").length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No approved leaves on record.</div>
              ) : (
                leaves.filter(l => l.status === "Approved").slice(0, 6).map((p) => (
                  <div key={p.id} className="flex justify-between items-center py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar src={p.avatar} name={p.employee} size={28} />
                      <div>
                        <div className="font-semibold text-slate-700">{p.employee}</div>
                        <div className="text-[10px] text-slate-500">{p.type}</div>
                      </div>
                    </div>
                    <div className="font-semibold text-slate-600">
                      {p.from} to {p.to} ({p.days} days)
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
              <Users className="h-3.5 w-3.5" />
              <span><span className="font-bold text-slate-900">{leaves.filter(l => l.status === "Approved").length}</span> approved leaves on schedule</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Apply modal */}
      {showApply && (
        <ApplyLeaveModal 
          onClose={() => setShowApply(false)} 
          onApply={handleApplyLeave} 
        />
      )}
    </div>
  );
}

function ApplyLeaveModal({ onClose, onApply }: { onClose: () => void; onApply: (leave: Omit<LeaveRequest, "id" | "employee" | "department" | "status" | "avatar">) => void }) {
  const [type, setType] = useState("Casual Leave");
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || !reason.trim()) {
      alert("Please fill all fields.");
      return;
    }
    
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    onApply({
      type,
      from,
      to,
      days,
      reason
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-900">Apply for Leave</h2>
            <p className="text-xs text-slate-500">Submit a new leave request for approval</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-130px)] space-y-4 overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Casual Leave", icon: Coffee, color: "from-amber-500 to-orange-500" },
              { label: "Sick Leave", icon: Heart, color: "from-rose-500 to-pink-600" },
              { label: "Earned Leave", icon: Plane, color: "from-indigo-500 to-violet-600" },
              { label: "Work From Home", icon: Briefcase, color: "from-emerald-500 to-teal-600" },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.label;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setType(t.label)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${isSelected ? "border-indigo-500 bg-indigo-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${t.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{t.label}</div>
                    <div className="text-[11px] text-slate-500">Available</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="From Date" type="date" leftIcon={<Calendar className="h-4 w-4" />} value={from} onChange={(e) => setFrom(e.target.value)} required />
            <Input label="To Date" type="date" leftIcon={<Calendar className="h-4 w-4" />} value={to} onChange={(e) => setTo(e.target.value)} required />
          </div>

          <Textarea label="Reason for Leave" placeholder="Briefly describe the reason for your leave…" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs text-indigo-700">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="h-3.5 w-3.5" /> Approval SLA
            </div>
            <p className="mt-1 text-indigo-600/80">Your request will be submitted to the Admin portal. Admins will review it shortly.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gradient" size="md">Submit Request</Button>
        </div>
      </form>
    </div>
  );
}
