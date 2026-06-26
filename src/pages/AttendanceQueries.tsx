import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  MessageSquare, Search, Clock, CheckCircle2, XCircle,
  ChevronRight, CalendarDays, RefreshCw, Inbox,
} from "lucide-react";
import { cn } from "../utils/cn";
import {
  PageHeader, Card, CardHeader, Avatar, Button, Input, Tabs, EmptyState,
} from "../components/ui";
import {
  useQueryStore,
  type AttendanceQuery, type QueryStatus,
} from "../data/queryStore";
import { ReviewQueryModal, QueryDetailModal, STATUS_CFG } from "../components/AttendanceQueryModal";
import type { SyncedEmployee } from "../data/store";

// ─── Type helpers ─────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try { return format(new Date(iso), "MMM d, yyyy"); } catch { return iso; }
}
function formatDateTime(iso: string) {
  try { return format(new Date(iso), "MMM d · h:mm a"); } catch { return iso; }
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: QueryStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold", cfg.bg, cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function SummaryCard({ label, count, icon: Icon, gradient, textColor }: {
  label: string; count: number;
  icon: React.ElementType; gradient: string; textColor: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white p-4")}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className={cn("font-display text-2xl font-extrabold", textColor)}>{count}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AttendanceQueries({
  currentUser,
}: {
  currentUser: SyncedEmployee;
}) {
  const { queries, refresh } = useQueryStore();
  const isAdmin = currentUser.role === "Admin";

  const [tab, setTab]               = useState<"all" | QueryStatus>("all");
  const [search, setSearch]         = useState("");
  const [selectedQuery, setSelectedQuery] = useState<AttendanceQuery | null>(null);
  const [modalType, setModalType]   = useState<"review" | "detail" | null>(null);

  // Filter: employee sees only their own queries
  const myQueries = useMemo(
    () => isAdmin ? queries : queries.filter((q) => q.employeeId === currentUser.id),
    [queries, isAdmin, currentUser.id]
  );

  // Apply tab + search filter
  const filtered = useMemo(() => {
    let list = myQueries;
    if (tab !== "all") list = list.filter((q) => q.status === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.employeeName.toLowerCase().includes(s) ||
          q.subject.toLowerCase().includes(s) ||
          q.queryType.toLowerCase().includes(s) ||
          q.date.includes(s)
      );
    }
    return list;
  }, [myQueries, tab, search]);

  // Summary counts
  const counts = useMemo(() => {
    const c: Record<QueryStatus | "total", number> = { total: myQueries.length, Pending: 0, "In Review": 0, Resolved: 0, Rejected: 0 };
    myQueries.forEach((q) => c[q.status]++);
    return c;
  }, [myQueries]);

  const openModal = (query: AttendanceQuery) => {
    setSelectedQuery(query);
    setModalType(isAdmin ? "review" : "detail");
  };

  // ── Admin summary cards ──────────────────────────────────────────────────────
  const adminSummaryCards = [
    { label: "Total Queries", count: counts.total,        icon: MessageSquare, gradient: "from-indigo-500 to-violet-600", textColor: "text-slate-900" },
    { label: "Pending",       count: counts.Pending,      icon: Clock,         gradient: "from-amber-500 to-orange-500",  textColor: "text-amber-700" },
    { label: "In Review",     count: counts["In Review"], icon: RefreshCw,     gradient: "from-indigo-500 to-blue-600",   textColor: "text-indigo-700" },
    { label: "Resolved",      count: counts.Resolved,     icon: CheckCircle2,  gradient: "from-emerald-500 to-teal-600",  textColor: "text-emerald-700" },
    { label: "Rejected",      count: counts.Rejected,     icon: XCircle,       gradient: "from-rose-500 to-pink-600",     textColor: "text-rose-700" },
  ];

  const employeeSummaryCards = [
    { label: "My Total",   count: counts.total,        icon: MessageSquare, gradient: "from-indigo-500 to-violet-600", textColor: "text-slate-900" },
    { label: "Pending",    count: counts.Pending,      icon: Clock,         gradient: "from-amber-500 to-orange-500",  textColor: "text-amber-700" },
    { label: "In Review",  count: counts["In Review"], icon: RefreshCw,     gradient: "from-indigo-500 to-blue-600",   textColor: "text-indigo-700" },
    { label: "Resolved",   count: counts.Resolved,     icon: CheckCircle2,  gradient: "from-emerald-500 to-teal-600",  textColor: "text-emerald-700" },
  ];

  const summaryCards = isAdmin ? adminSummaryCards : employeeSummaryCards;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Attendance Queries"
        subtitle={isAdmin ? "Review and respond to employee attendance disputes" : "Track your attendance query submissions"}
        breadcrumb={[{ label: "Attendance" }, { label: "Queries" }]}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={refresh}>
            Refresh
          </Button>
        }
      />

      {/* Summary Strip */}
      <div className={cn("grid gap-3", isAdmin ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
        {summaryCards.map((c) => (
          <SummaryCard key={c.label} {...c} />
        ))}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader
          title={isAdmin ? "All Attendance Queries" : "My Submitted Queries"}
          subtitle={isAdmin ? `${filtered.length} of ${myQueries.length} queries shown` : `${filtered.length} queries`}
          action={
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="w-52">
                  <Input
                    placeholder="Search employee, type..."
                    leftIcon={<Search className="h-3.5 w-3.5" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              )}
            </div>
          }
        />

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-slate-100">
          <Tabs
            value={tab}
            onChange={(v) => setTab(v as "all" | QueryStatus)}
            items={[
              { value: "all",       label: "All",       count: myQueries.length },
              { value: "Pending",   label: "Pending",   count: counts.Pending },
              { value: "In Review", label: "In Review", count: counts["In Review"] },
              { value: "Resolved",  label: "Resolved",  count: counts.Resolved },
              { value: "Rejected",  label: "Rejected",  count: counts.Rejected },
            ]}
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-7 w-7" />}
            title={myQueries.length === 0 ? "No queries yet" : "No results found"}
            description={
              myQueries.length === 0
                ? isAdmin
                  ? "No attendance queries have been raised by employees."
                  : "Click on any date in the Attendance Calendar to raise a query."
                : "Try adjusting your filter or search term."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {isAdmin && <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee</th>}
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Subject</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Submitted</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 hidden xl:table-cell">HR Response</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((query) => {
                  return (
                    <tr
                      key={query.id}
                      onClick={() => openModal(query)}
                      className="group cursor-pointer hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Employee (admin only) */}
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={query.avatar} name={query.employeeName} size={32} />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate">{query.employeeName}</div>
                              <div className="text-[11px] text-slate-500 truncate">{query.department}</div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Date */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {formatDate(query.date)}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {query.queryType}
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="px-5 py-3.5 hidden md:table-cell max-w-[200px]">
                        <div className="truncate text-xs font-medium text-slate-700">{query.subject}</div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={query.status} />
                      </td>

                      {/* Submitted */}
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="text-[11px] text-slate-500">{formatDateTime(query.createdAt)}</div>
                      </td>

                      {/* HR Response preview */}
                      <td className="px-5 py-3.5 hidden xl:table-cell max-w-[200px]">
                        {query.hrResponse ? (
                          <div className="truncate text-[11px] text-slate-500">{query.hrResponse}</div>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic">Awaiting response</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="pr-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && query.status === "Pending" && (
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="Needs review" />
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      {selectedQuery && modalType === "review" && (
        <ReviewQueryModal
          query={selectedQuery}
          reviewerName={currentUser.name}
          onClose={() => { setSelectedQuery(null); setModalType(null); }}
        />
      )}
      {selectedQuery && modalType === "detail" && (
        <QueryDetailModal
          query={selectedQuery}
          onClose={() => { setSelectedQuery(null); setModalType(null); }}
        />
      )}
    </div>
  );
}
