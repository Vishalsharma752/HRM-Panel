import { useState } from "react";
import { format } from "date-fns";
import {
  X, AlertCircle, Clock, CheckCircle2, XCircle,
  Send, MessageSquare, CalendarDays, Loader2,
} from "lucide-react";
import { cn } from "../utils/cn";
import { Button, Avatar, Textarea, Input, Select } from "./ui";
import {
  createQuery, updateQuery,
  type AttendanceQuery, type QueryStatus, type QueryType,
} from "../data/queryStore";
import type { SyncedEmployee } from "../data/store";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface QueryRaiseData {
  date: Date;
  dateStr: string;
  attendanceSnapshot?: { checkIn: string; checkOut: string; status: string };
}

// ─── Status badge config ──────────────────────────────────────────────────────
export const STATUS_CFG: Record<QueryStatus, {
  bg: string; text: string; dot: string; label: string;
  badge: "success" | "warning" | "danger" | "info" | "neutral" | "indigo" | "violet";
}> = {
  "Pending":   { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400",  label: "Pending",   badge: "warning" },
  "In Review": { bg: "bg-indigo-50",  text: "text-indigo-700", dot: "bg-indigo-400", label: "In Review", badge: "indigo"  },
  "Resolved":  { bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500",label: "Resolved",  badge: "success" },
  "Rejected":  { bg: "bg-rose-50",    text: "text-rose-700",   dot: "bg-rose-500",   label: "Rejected",  badge: "danger"  },
};

export const QUERY_TYPES: QueryType[] = [
  "Missed Punch-In", "Missed Punch-Out", "Wrong Status",
  "Early Departure", "Half Day", "Other",
];

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatDateLong(dateStr: string) {
  try { return format(new Date(dateStr + "T00:00:00"), "EEEE, MMMM d, yyyy"); }
  catch { return dateStr; }
}

// ─── Raise Query Modal (Employee) ─────────────────────────────────────────────
export function RaiseQueryModal({
  data, currentUser, onClose,
}: {
  data: QueryRaiseData;
  currentUser: SyncedEmployee;
  onClose: () => void;
}) {
  const [queryType, setQueryType] = useState<QueryType>("Missed Punch-In");
  const [subject, setSubject]     = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!subject.trim())      e.subject = "Subject is required.";
    if (!description.trim())  e.description = "Please describe the issue.";
    if (description.trim().length < 10) e.description = "Please provide more detail (min 10 chars).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate async
    createQuery({
      employeeId:    currentUser.id,
      employeeName:  currentUser.name,
      department:    currentUser.department,
      avatar:        currentUser.avatar,
      date:          data.dateStr,
      queryType,
      subject:       subject.trim(),
      description:   description.trim(),
      attendanceSnapshot: data.attendanceSnapshot,
    });
    setLoading(false);
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Attendance Dispute</div>
              <div className="font-bold text-white text-sm">Raise a Query</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">Query Submitted!</h3>
            <p className="mt-2 text-sm text-slate-500">
              Your attendance query for <strong>{formatDateLong(data.dateStr)}</strong> has been submitted.
              HR will review and respond shortly.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Pending Review
            </div>
            <div className="mt-6">
              <Button variant="secondary" size="md" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Date banner */}
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <CalendarDays className="h-4 w-4 text-slate-500 shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disputed Date</div>
                <div className="text-sm font-bold text-slate-900">{formatDateLong(data.dateStr)}</div>
              </div>
            </div>

            {/* Attendance snapshot */}
            {data.attendanceSnapshot ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Check In",  value: data.attendanceSnapshot.checkIn || "—" },
                  { label: "Check Out", value: data.attendanceSnapshot.checkOut === "-" ? "Active" : (data.attendanceSnapshot.checkOut || "—") },
                  { label: "Status",    value: data.attendanceSnapshot.status },
                ].map((f) => (
                  <div key={f.label} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</div>
                    <div className="mt-1 text-xs font-bold text-slate-900">{f.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                No attendance record found for this date in the system.
              </div>
            )}

            {/* Query Type */}
            <Select
              label="Query Type"
              value={queryType}
              onChange={(e) => setQueryType(e.target.value as QueryType)}
            >
              {QUERY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>

            {/* Subject */}
            <div>
              <Input
                label="Subject"
                placeholder="Brief summary of the issue..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                error={errors.subject}
              />
            </div>

            {/* Description */}
            <div>
              <Textarea
                label="Description"
                placeholder="Please describe the issue in detail. What happened? What should the correct record be?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px]"
              />
              {errors.description && <p className="mt-1 text-xs font-medium text-rose-600">{errors.description}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? "Submitting..." : "Submit Query"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Review Query Modal (Admin/HR) ────────────────────────────────────────────
export function ReviewQueryModal({
  query, reviewerName, onClose,
}: {
  query: AttendanceQuery;
  reviewerName: string;
  onClose: () => void;
}) {
  const [status, setStatus]     = useState<QueryStatus>(query.status === "Pending" ? "In Review" : query.status);
  const [hrResponse, setHrResponse] = useState(query.hrResponse || "");
  const [loading, setLoading]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  const cfg = STATUS_CFG[query.status];

  const handleSave = async () => {
    if (!hrResponse.trim()) { setError("Please provide a response before saving."); return; }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    updateQuery(query.id, status, hrResponse.trim(), reviewerName);
    setLoading(false);
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">Review Attendance Query</div>
              <div className="text-[11px] text-slate-500">ID: {query.id}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", cfg.bg, cfg.text, `ring-${cfg.dot.replace("bg-","")}/30`)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
            </span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Employee info */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
            <Avatar src={query.avatar} name={query.employeeName} size={40} />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm">{query.employeeName}</div>
              <div className="text-xs text-slate-500">{query.department}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted</div>
              <div className="text-xs font-semibold text-slate-700">
                {format(new Date(query.createdAt), "MMM d, yyyy · h:mm a")}
              </div>
            </div>
          </div>

          {/* Query details */}
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-600">Disputed Date: <span className="text-slate-900">{formatDateLong(query.date)}</span></div>
              <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">{query.queryType}</span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</div>
                <div className="text-sm font-semibold text-slate-900">{query.subject}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</div>
                <div className="text-sm text-slate-700 leading-relaxed">{query.description}</div>
              </div>
            </div>
          </div>

          {/* Attendance snapshot */}
          {query.attendanceSnapshot && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Check In",  value: query.attendanceSnapshot.checkIn || "—" },
                { label: "Check Out", value: query.attendanceSnapshot.checkOut === "-" ? "Active" : (query.attendanceSnapshot.checkOut || "—") },
                { label: "Status",    value: query.attendanceSnapshot.status },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</div>
                  <div className="mt-1.5 text-sm font-bold text-slate-900">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Update status */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">HR Review Panel</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Update Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QueryStatus)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
                >
                  <option value="In Review">In Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold w-full justify-center", STATUS_CFG[status].bg, STATUS_CFG[status].text)}>
                  <span className={cn("h-2 w-2 rounded-full", STATUS_CFG[status].dot)} />
                  Will be marked: {STATUS_CFG[status].label}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">HR Response <span className="text-rose-500">*</span></label>
              <textarea
                value={hrResponse}
                onChange={(e) => setHrResponse(e.target.value)}
                placeholder="Provide a clear response to the employee's query..."
                className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none"
              />
              {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-4 flex items-center gap-3 shrink-0">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            leftIcon={saved ? <CheckCircle2 className="h-4 w-4" /> : loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            disabled={loading || saved}
            onClick={handleSave}
          >
            {saved ? "Saved!" : loading ? "Saving..." : "Save Response"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Query Detail Modal (Employee read-only view) ─────────────────────────────
export function QueryDetailModal({
  query, onClose,
}: {
  query: AttendanceQuery;
  onClose: () => void;
}) {
  const cfg = STATUS_CFG[query.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4 w-4 text-slate-500" />
            <span className="font-bold text-slate-900 text-sm">My Attendance Query</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", cfg.bg, cfg.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
            </span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDateLong(query.date)}
            <span className="ml-auto text-[11px]">Submitted {format(new Date(query.createdAt), "MMM d, h:mm a")}</span>
          </div>

          {/* Details */}
          <div className="rounded-xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-2.5 py-1">{query.queryType}</span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</div>
              <div className="text-sm font-semibold text-slate-900">{query.subject}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</div>
              <div className="text-sm text-slate-700 leading-relaxed">{query.description}</div>
            </div>
          </div>

          {/* Attendance snapshot */}
          {query.attendanceSnapshot && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Check In",  value: query.attendanceSnapshot.checkIn || "—" },
                { label: "Check Out", value: query.attendanceSnapshot.checkOut === "-" ? "Active" : (query.attendanceSnapshot.checkOut || "—") },
                { label: "Status",    value: query.attendanceSnapshot.status },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</div>
                  <div className="mt-1.5 text-xs font-bold text-slate-900">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* HR Response */}
          {query.hrResponse ? (
            <div className={cn("rounded-xl border p-4 space-y-2", STATUS_CFG[query.status].bg)}>
              <div className={cn("text-[10px] font-bold uppercase tracking-wider", STATUS_CFG[query.status].text)}>
                HR Response
                {query.respondedBy && <span className="ml-2 font-normal normal-case">by {query.respondedBy}</span>}
              </div>
              <div className="text-sm text-slate-800 leading-relaxed">{query.hrResponse}</div>
              {query.respondedAt && (
                <div className="text-[11px] text-slate-400">{format(new Date(query.respondedAt), "MMM d, yyyy · h:mm a")}</div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs font-semibold text-amber-700 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Awaiting HR review. You will be notified once resolved.
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 shrink-0">
          <Button variant="secondary" size="md" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
