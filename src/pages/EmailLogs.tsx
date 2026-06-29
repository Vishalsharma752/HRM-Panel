import { useState, useEffect, useCallback } from "react";
import { Mail, Clock, RefreshCw, AlertTriangle, CheckCircle2, AlertOctagon, Filter, ChevronRight } from "lucide-react";
import { Button, Badge } from "../components/ui";
import { supabase } from "../components/supabase";

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  template_type: string;
  status: "Sent" | "Failed";
  error_message: string | null;
  sent_at: string;
}

export function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "Sent" | "Failed">("All");
  const [templateFilter, setTemplateFilter] = useState<string>("All");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false });

      if (statusFilter !== "All") {
        query = query.eq("status", statusFilter);
      }
      if (templateFilter !== "All") {
        query = query.eq("template_type", templateFilter);
      }

      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;
      setLogs(data || []);
    } catch (err: any) {
      console.error("[EmailLogs] Error fetching logs:", err);
      setError(err.message || "Failed to load email transaction logs.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, templateFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Statistics
  const totalCount = logs.length;
  const sentCount = logs.filter(l => l.status === "Sent").length;
  const failedCount = logs.filter(l => l.status === "Failed").length;
  const uniqueTemplates = Array.from(new Set(logs.map(l => l.template_type)));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Email Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monitor deliverability and errors for all automated workflows</p>
        </div>
        <Button
          onClick={fetchLogs}
          variant="outline"
          disabled={loading}
          leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Audit Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Attempts</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{totalCount}</h3>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 shadow-inner">
            <Mail className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivered Successfully</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{sentCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Failed / Bounced</p>
            <h3 className="text-3xl font-extrabold text-rose-600 mt-1">{failedCount}</h3>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shadow-inner">
            <AlertOctagon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & Control bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Filters:</span>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="Sent">Delivered</option>
            <option value="Failed">Failed</option>
          </select>

          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="All">All Templates</option>
            {uniqueTemplates.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {logs.length > 0 && (
          <div className="text-xs text-slate-400 font-semibold">
            Showing {logs.length} logged emails
          </div>
        )}
      </div>

      {/* Log list grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading audit records…</p>
          </div>
        ) : error ? (
          <div className="p-16 text-center">
            <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
            <h3 className="font-bold text-slate-800">Connection Failed</h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <Mail className="h-10 w-10 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-800">No Records Found</h3>
            <p className="text-sm text-slate-500 mt-1">There are no matching email entries matching the current filter set.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Recipient</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Template Type</th>
                  <th className="py-3.5 px-4">Sent At</th>
                  <th className="py-3.5 px-4">Delivery Status</th>
                  <th className="py-3.5 px-6">Error Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-semibold text-slate-800">{log.to_email}</td>
                    <td className="py-4 px-4 text-slate-600">{log.subject}</td>
                    <td className="py-4 px-4 font-mono font-bold text-indigo-600">{log.template_type}</td>
                    <td className="py-4 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{new Date(log.sent_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {log.status === "Sent" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                          Bounced
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate text-rose-500 font-mono text-[10px]" title={log.error_message || ""}>
                      {log.error_message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
